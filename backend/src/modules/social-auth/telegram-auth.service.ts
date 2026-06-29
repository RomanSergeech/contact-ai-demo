import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { LogLevel } from 'telegram/extensions/Logger'
import { computeCheck } from 'telegram/Password'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { encrypt } from '../../common/utils/encrypt'
import { writeAudit } from '../../common/utils/audit'

const SESSION_TTL_MS = 5 * 60_000

type TLoginStep = 'code' | 'password' | 'qr'

type TLoginState = {
  client:        TelegramClient
  phone:         string
  phoneCodeHash: string
  step:          TLoginStep
  expiresAt:     number
  qrDone?:       boolean
}

@Injectable()
export class TelegramAuthService {
  private readonly logger = new Logger(TelegramAuthService.name)
  private readonly sessions = new Map<string, TLoginState>()

  constructor(
    private readonly config: ConfigService,
    private readonly db:     DatabaseService,
  ) {
    setInterval(() => this.cleanupSessions(), 60_000).unref()
  }

  private cleanupSessions(): void {
    const now = Date.now()
    for (const [userId, state] of this.sessions) {
      if (state.expiresAt < now) {
        state.client.disconnect().catch(() => {})
        this.sessions.delete(userId)
      }
    }
  }

  private getCredentials(): { apiId: number; apiHash: string } {
    const apiId   = Number(this.config.get<string>('TELEGRAM_API_ID'))
    const apiHash = this.config.get<string>('TELEGRAM_API_HASH')
    if (!apiId || !apiHash) throw new BadRequestException('Telegram-интеграция не настроена на сервере')
    return { apiId, apiHash }
  }

  private getProxyOptions(): { socksType: 5; ip: string; port: number; timeout: number } | undefined {
    const ip   = this.config.get<string>('TELEGRAM_PROXY_IP')
    const port = Number(this.config.get<string>('TELEGRAM_PROXY_PORT'))
    if (!ip || !port) return undefined
    return { socksType: 5, ip, port, timeout: 30 }
  }

  private async dropSession(userId: string): Promise<void> {
    const existing = this.sessions.get(userId)
    if (!existing) return
    existing.client._destroyed = true
    await existing.client.disconnect().catch(() => {})
    this.sessions.delete(userId)
  }

  async startLogin(userId: string, phone: string): Promise<{ step: 'code' }> {
    await this.dropSession(userId)

    const { apiId, apiHash } = this.getCredentials()
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5, autoReconnect: true, proxy: this.getProxyOptions() })
    client.setLogLevel(LogLevel.NONE)
    await client.connect()

    let phoneCodeHash: string
    try {
      const result = await client.sendCode({ apiId, apiHash }, phone)
      phoneCodeHash = result.phoneCodeHash
    } catch (err) {
      await client.disconnect().catch(() => {})
      this.logger.error(`Telegram sendCode failed: ${err}`)
      throw new BadRequestException('Не удалось отправить код, проверьте номер телефона')
    }

    this.sessions.set(userId, { client, phone, phoneCodeHash, step: 'code', expiresAt: Date.now() + SESSION_TTL_MS })

    return { step: 'code' }
  }

  async submitCode(userId: string, code: string): Promise<{ step: 'password' | 'done' }> {
    const state = this.sessions.get(userId)
    if (!state || state.step !== 'code') throw new BadRequestException('Сессия входа истекла, начните заново')

    try {
      await state.client.invoke(new Api.auth.SignIn({
        phoneNumber:   state.phone,
        phoneCodeHash: state.phoneCodeHash,
        phoneCode:     code,
      }))
    } catch (err: unknown) {
      const e = err as { errorMessage?: string }

      if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        state.step = 'password'
        state.expiresAt = Date.now() + SESSION_TTL_MS
        return { step: 'password' }
      }
      if (e.errorMessage === 'PHONE_CODE_INVALID') throw new BadRequestException('Неверный код')
      if (e.errorMessage === 'PHONE_CODE_EXPIRED') throw new BadRequestException('Код истёк, начните заново')

      this.logger.error(`Telegram signIn failed: ${e.errorMessage ?? err}`)
      throw new BadRequestException('Не удалось войти в Telegram')
    }

    return this.finalize(userId)
  }

  async submitPassword(userId: string, password: string): Promise<{ step: 'done' }> {
    const state = this.sessions.get(userId)
    if (!state || state.step !== 'password') throw new BadRequestException('Сессия входа истекла, начните заново')

    try {
      const passwordInfo = await state.client.invoke(new Api.account.GetPassword())
      const srpCheck = await computeCheck(passwordInfo, password)
      await state.client.invoke(new Api.auth.CheckPassword({ password: srpCheck }))
    } catch (err: unknown) {
      const e = err as { errorMessage?: string }

      if (e.errorMessage === 'PASSWORD_HASH_INVALID') throw new BadRequestException('Неверный пароль')

      this.logger.error(`Telegram checkPassword failed: ${e.errorMessage ?? err}`)
      throw new BadRequestException('Не удалось войти в Telegram')
    }

    return this.finalize(userId)
  }

  async cancelLogin(userId: string): Promise<void> {
    await this.dropSession(userId)
  }

  async startQrLogin(userId: string): Promise<{ token: string; expires: number }> {
    await this.dropSession(userId)

    const { apiId, apiHash } = this.getCredentials()
    const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5, autoReconnect: true, proxy: this.getProxyOptions() })
    client.setLogLevel(LogLevel.NONE)
    await client.connect()

    let result
    try {
      result = await client.invoke(new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] }))
    } catch (err) {
      await client.disconnect().catch(() => {})
      this.logger.error(`Telegram ExportLoginToken failed: ${err}`)
      throw new BadRequestException('Не удалось создать QR-код')
    }

    if (result instanceof Api.auth.LoginTokenMigrateTo) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any)._switchDC(result.dcId)
        result = await client.invoke(new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] }))
      } catch (err) {
        await client.disconnect().catch(() => {})
        this.logger.error(`Telegram DC migration failed: ${err}`)
        throw new BadRequestException('Не удалось создать QR-код')
      }
    }

    if (!(result instanceof Api.auth.LoginToken)) {
      await client.disconnect().catch(() => {})
      throw new BadRequestException('Не удалось создать QR-код')
    }

    const token = Buffer.from(result.token as unknown as Uint8Array).toString('base64url')

    this.sessions.set(userId, { client, phone: '', phoneCodeHash: '', step: 'qr', expiresAt: Date.now() + SESSION_TTL_MS })

    // UpdateLoginToken приходит при скане QR — нужно переспросить ExportLoginToken,
    // чтобы убедиться что пользователь нажал «Подтвердить» (а не просто навёл камеру).
    client.addEventHandler(async (update: unknown) => {
      const s = this.sessions.get(userId)
      if (!s || s.step !== 'qr' || s.qrDone) return
      if ((update as { className?: string })?.className !== 'UpdateLoginToken') return
      try {
        const creds = this.getCredentials()
        const res = await s.client.invoke(new Api.auth.ExportLoginToken({ apiId: creds.apiId, apiHash: creds.apiHash, exceptIds: [] }))
        if (res instanceof Api.auth.LoginTokenSuccess) {
          s.qrDone = true
        }
      } catch (err) {
        const e = err as { errorMessage?: string }
        if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          s.step = 'password'
        }
      }
    })

    return { token, expires: result.expires }
  }

  async pollQrLogin(userId: string): Promise<{ step: 'pending' | 'done' | 'password'; token?: string; expires?: number }> {
    const state = this.sessions.get(userId)
    if (!state) throw new BadRequestException('Сессия истекла, начните заново')

    // Event handler уже определил необходимость 2FA-пароля
    if (state.step === 'password') return { step: 'password' }

    if (state.step !== 'qr') throw new BadRequestException('Сессия истекла, начните заново')

    // Событие UpdateLoginToken уже зафиксировано обработчиком — сразу финализируем
    if (state.qrDone) return this.finalize(userId)

    state.expiresAt = Date.now() + SESSION_TTL_MS

    const { apiId, apiHash } = this.getCredentials()

    let result
    try {
      result = await state.client.invoke(new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] }))
    } catch (err) {
      const e = err as { errorMessage?: string }
      if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        state.step = 'password'
        return { step: 'password' }
      }
      this.logger.warn(`QR poll invoke failed: ${err}`)
      return { step: 'pending' }
    }

    if (result instanceof Api.auth.LoginTokenSuccess) {
      return this.finalize(userId)
    }

    if (result instanceof Api.auth.LoginTokenMigrateTo) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (state.client as any)._switchDC(result.dcId)
        const migrated = await state.client.invoke(new Api.auth.ImportLoginToken({ token: result.token }))
        if (migrated instanceof Api.auth.LoginTokenSuccess) {
          return this.finalize(userId)
        }
      } catch (err) {
        const e = err as { errorMessage?: string }
        if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          state.step = 'password'
          return { step: 'password' }
        }
        this.logger.warn(`QR poll DC migration failed: ${err}`)
      }
      return { step: 'pending' }
    }

    if (result instanceof Api.auth.LoginToken) {
      const token = Buffer.from(result.token as unknown as Uint8Array).toString('base64url')
      return { step: 'pending', token, expires: result.expires }
    }

    return { step: 'pending' }
  }

  private async finalize(userId: string): Promise<{ step: 'done' }> {
    const state = this.sessions.get(userId)
    if (!state) throw new BadRequestException('Сессия входа истекла, начните заново')

    const sessionString = state.client.session.save() as unknown as string
    await this.db.db.update(schema.users).set({ telegram_session: encrypt(sessionString) }).where(eq(schema.users.id, userId))
    writeAudit(this.db.db, userId, 'user.connect_telegram')

    state.client._destroyed = true
    await state.client.disconnect().catch(() => {})
    this.sessions.delete(userId)

    return { step: 'done' }
  }
}
