import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes, createHash } from 'crypto'
import { eq } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { encrypt, decrypt } from '../../common/utils/encrypt'
import { writeAudit } from '../../common/utils/audit'

const STATE_TTL_MS = 10 * 60_000
const REFRESH_THRESHOLD_MS = 60_000

type TPendingState = {
  userId:       string
  codeVerifier: string
  returnTo:     string | null
  clientOrigin: string
  popup:        boolean
  expiresAt:    number
}

type TVkTokenResponse = {
  access_token:  string
  refresh_token: string
  expires_in:    number
  user_id:       number
}

@Injectable()
export class VkOauthService {
  private readonly logger = new Logger(VkOauthService.name)
  private readonly pendingStates = new Map<string, TPendingState>()

  constructor(
    private readonly config: ConfigService,
    private readonly db:     DatabaseService,
  ) {
    setInterval(() => this.cleanupStates(), 60_000).unref()
  }

  private cleanupStates(): void {
    const now = Date.now()
    for (const [state, entry] of this.pendingStates) {
      if (entry.expiresAt < now) this.pendingStates.delete(state)
    }
  }

  private getRedirectUri(): string {
    const backendUrl = this.config.get<string>('BACKEND_URL') ?? 'http://localhost:5000'
    return `${backendUrl}/api/auth/vk/callback`
  }

  buildAuthorizeUrl(userId: string, returnTo: string | null, clientOrigin: string, popup: boolean): string {
    const clientId = this.config.getOrThrow<string>('VK_CLIENT_ID')

    const codeVerifier  = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const state         = randomBytes(16).toString('hex')

    this.pendingStates.set(state, { userId, codeVerifier, returnTo, clientOrigin, popup, expiresAt: Date.now() + STATE_TTL_MS })

    const params = new URLSearchParams({
      response_type:        'code',
      client_id:            clientId,
      redirect_uri:         this.getRedirectUri(),
      state,
      code_challenge:       codeChallenge,
      code_challenge_method: 'S256',
    })

    return `https://id.vk.com/authorize?${params.toString()}`
  }

  getPendingClientOrigin(state: string): string | null {
    return this.pendingStates.get(state)?.clientOrigin ?? null
  }

  getPendingPopup(state: string): boolean {
    return this.pendingStates.get(state)?.popup ?? false
  }

  async handleCallback(code: string, state: string, deviceId: string | undefined): Promise<{ returnTo: string | null; clientOrigin: string; popup: boolean }> {
    const entry = this.pendingStates.get(state)
    if (!entry) throw new BadRequestException('Сессия авторизации VK истекла, попробуйте снова')
    this.pendingStates.delete(state)

    const data = await this.exchangeToken({
      grant_type:    'authorization_code',
      code,
      code_verifier: entry.codeVerifier,
      redirect_uri:  this.getRedirectUri(),
      device_id:     deviceId ?? '',
    })

    await this.db.db.update(schema.users).set({
      vk_access_token:     encrypt(data.access_token),
      vk_refresh_token:    encrypt(data.refresh_token),
      vk_token_expires_at: new Date(Date.now() + data.expires_in * 1000),
      vk_user_id:          String(data.user_id),
    }).where(eq(schema.users.id, entry.userId))

    writeAudit(this.db.db, entry.userId, 'user.connect_vk')

    return { returnTo: entry.returnTo, clientOrigin: entry.clientOrigin, popup: entry.popup }
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const rows = await this.db.db.select().from(schema.users).where(eq(schema.users.id, userId))
    const user = rows[0]
    if (!user?.vk_access_token) throw new BadRequestException('NOT_CONNECTED')

    const expiresAt    = user.vk_token_expires_at
    const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS

    if (!needsRefresh) return decrypt(user.vk_access_token)!
    if (!user.vk_refresh_token) return decrypt(user.vk_access_token)!

    const refreshToken = decrypt(user.vk_refresh_token)
    if (!refreshToken) return decrypt(user.vk_access_token)!

    let data: TVkTokenResponse
    try {
      data = await this.exchangeToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
    } catch (err) {
      this.logger.error(`VK token refresh failed: ${err}`)
      throw new UnauthorizedException('VK-сессия истекла, переподключите аккаунт в настройках')
    }

    await this.db.db.update(schema.users).set({
      vk_access_token:     encrypt(data.access_token),
      vk_refresh_token:    encrypt(data.refresh_token),
      vk_token_expires_at: new Date(Date.now() + data.expires_in * 1000),
    }).where(eq(schema.users.id, userId))

    return data.access_token
  }

  private async exchangeToken(params: Record<string, string>): Promise<TVkTokenResponse> {
    const clientId    = this.config.getOrThrow<string>('VK_CLIENT_ID')
    const serviceToken = this.config.getOrThrow<string>('VK_CLIENT_SECRET')

    const res = await fetch('https://id.vk.com/oauth2/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ ...params, client_id: clientId, service_token: serviceToken }),
    })

    if (!res.ok) {
      this.logger.error(`VK token exchange failed: ${res.status} ${await res.text()}`)
      throw new BadRequestException('Не удалось получить токен VK')
    }

    const data = await res.json() as TVkTokenResponse & { error?: string }
    if (data.error || !data.access_token) {
      this.logger.error(`VK token exchange returned error: ${JSON.stringify(data)}`)
      throw new BadRequestException('Не удалось получить токен VK')
    }
    if (!Number.isFinite(data.expires_in)) data.expires_in = 3600

    return data
  }
}
