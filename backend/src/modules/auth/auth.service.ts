import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import type { TTokenPayload } from './auth.types'
import type { TUserPublic } from '../../common/types/user.types'

@Injectable()
export class AuthService {
  constructor(
    private readonly db:     DatabaseService,
    private readonly jwt:    JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(login: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: TUserPublic }> {
    const rows = await this.db.db.select().from(schema.users).where(eq(schema.users.login, login))
    const user = rows[0]

    if (!user) {
      // Сравниваем с фиктивным хешем, чтобы время ответа не зависело от существования логина
      // (защита от энумерации пользователей по таймингу).
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
      throw new UnauthorizedException('Неверный логин или пароль')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) throw new UnauthorizedException('Неверный логин или пароль')

    const payload: TTokenPayload = { id: user.id, login: user.login, name: user.name, role: user.role }
    const tokens = this.generateTokens(payload)

    await this.saveRefreshToken(user.login, tokens.refreshToken)

    const { password: _, refresh_token: __, vk_access_token, vk_refresh_token, vk_token_expires_at, vk_user_id, telegram_session, ...userPublic } = user
    return { ...tokens, user: { ...userPublic, vk_connected: vk_access_token !== null, telegram_connected: telegram_session !== null } }
  }

  async refresh(refreshToken: string | undefined): Promise<{ accessToken: string; refreshToken: string; user: TUserPublic }> {
    if (!refreshToken) throw new UnauthorizedException('Unauthorized')

    let payload: TTokenPayload
    try {
      payload = this.jwt.verify<TTokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Unauthorized')
    }

    const rows = await this.db.db.select().from(schema.users).where(eq(schema.users.login, payload.login))
    const user = rows[0]

    if (!user || !user.refresh_token) {
      throw new UnauthorizedException('Unauthorized')
    }

    if (user.refresh_token !== hashToken(refreshToken)) {
      // Повторное использование старого refresh-токена — возможна компрометация,
      // отзываем все токены пользователя
      await this.db.db.update(schema.users)
        .set({ refresh_token: null })
        .where(eq(schema.users.login, payload.login))
      throw new UnauthorizedException('Unauthorized')
    }

    const newPayload: TTokenPayload = { id: user.id, login: user.login, name: user.name, role: user.role }
    const tokens = this.generateTokens(newPayload)

    await this.saveRefreshToken(user.login, tokens.refreshToken)

    const { password: _, refresh_token: __, vk_access_token, vk_refresh_token, vk_token_expires_at, vk_user_id, telegram_session, ...userPublic } = user
    return { ...tokens, user: { ...userPublic, vk_connected: vk_access_token !== null, telegram_connected: telegram_session !== null } }
  }

  async logout(login: string): Promise<void> {
    await this.db.db.update(schema.users)
      .set({ refresh_token: null })
      .where(eq(schema.users.login, login))
  }

  private generateTokens(payload: TTokenPayload): { accessToken: string; refreshToken: string } {
    const accessToken  = this.jwt.sign(payload, {
      secret:    this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '2d',
    })
    const refreshToken = this.jwt.sign(payload, {
      secret:    this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    })
    return { accessToken, refreshToken }
  }

  private async saveRefreshToken(login: string, refreshToken: string): Promise<void> {
    await this.db.db.update(schema.users)
      .set({ refresh_token: hashToken(refreshToken) })
      .where(eq(schema.users.login, login))
  }
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

// Фиктивный bcrypt-хеш (cost=12) для выравнивания времени ответа при несуществующем логине.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('contact-ai-timing-guard', 12)
