import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { VK } from 'vk-io'
import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { LogLevel } from 'telegram/extensions/Logger'
import { eq } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { decrypt } from '../../common/utils/encrypt'
import { assertPublicUrlHost, ssrfHttpAgent, ssrfHttpsAgent, ssrfBeforeRedirect } from '../../common/utils/ssrf-guard'

type TProxyOptions = { socksType: 5; ip: string; port: number; timeout: number }

async function withTelegramClient<T>(
  session: string,
  apiId: number,
  apiHash: string,
  fn: (client: TelegramClient) => Promise<T>,
  proxy?: TProxyOptions,
): Promise<T> {
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2, autoReconnect: false, proxy })
  client.setLogLevel(LogLevel.NONE)
  try {
    await client.connect()
    return await fn(client)
  } finally {
    client._destroyed = true
    await client.disconnect().catch(() => {})
  }
}

export type TSocialProfile = {
  name:     string | null
  bio:      string | null
  username: string | null
  phone?:   string | null
  site?:    string | null
}

export type TWebsiteContent = {
  url:   string
  title: string | null
  text:  string
}

export type TVkWallPost = {
  text:     string
  date:     number
  likes:    number
  reposts:  number
  comments: number
}

export type TTelegramPost = {
  text:  string
  date:  number
  views: number
}

const RATE_LIMIT_MS = 5_000
const WALL_POSTS_PERIOD_MS    = 7 * 24 * 60 * 60_000
const TELEGRAM_POSTS_PERIOD_MS = 7 * 24 * 60 * 60_000

@Injectable()
export class SocialProfileService {
  private readonly logger = new Logger(SocialProfileService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly db:     DatabaseService,
  ) {}

  private getProxyOptions(): TProxyOptions | undefined {
    const ip   = this.config.get<string>('TELEGRAM_PROXY_IP')
    const port = Number(this.config.get<string>('TELEGRAM_PROXY_PORT'))
    if (!ip || !port) return undefined
    return { socksType: 5, ip, port, timeout: 30 }
  }

  async checkRateLimit(userId: string): Promise<void> {
    const now  = Date.now()
    const rows = await this.db.db.select({ last_social_request_at: schema.users.last_social_request_at })
      .from(schema.users).where(eq(schema.users.id, userId))

    const last = rows[0]?.last_social_request_at?.getTime() ?? 0
    if (now - last < RATE_LIMIT_MS) {
      throw new BadRequestException('Подождите 5 секунд между запросами')
    }

    await this.db.db.update(schema.users)
      .set({ last_social_request_at: new Date() })
      .where(eq(schema.users.id, userId))
  }

  extractTelegramUsername(url: string): string {
    const trimmed = url.trim()
    const match = trimmed.match(/(?:t\.me|telegram\.me)\/(?:@)?([a-zA-Z0-9_]{5,32})/) ?? trimmed.match(/^@?([a-zA-Z0-9_]{5,32})$/)
    if (!match?.[1]) throw new BadRequestException('Не удалось распознать username Telegram из ссылки')
    return match[1]
  }

  extractVkId(url: string): string {
    const trimmed = url.trim()
    const match = trimmed.match(/vk\.com\/([a-zA-Z0-9_.]+)/) ?? trimmed.match(/^([a-zA-Z0-9_.]+)$/)
    if (!match?.[1]) throw new BadRequestException('Не удалось распознать идентификатор VK из ссылки')
    return match[1]
  }

  async fetchVkProfile(accessToken: string, idOrScreenName: string): Promise<TSocialProfile> {
    const vk = new VK({ token: accessToken })

    let users: Awaited<ReturnType<typeof vk.api.users.get>>
    try {
      users = await vk.api.users.get({
        user_ids: [idOrScreenName],
        fields:   ['bdate', 'about', 'career', 'occupation', 'status', 'interests', 'contacts', 'site'],
      })
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string }
      this.logger.error(`VK users.get failed: ${e.code ?? '?'} ${e.message ?? err}`)
      if (e.code === 5) throw new UnauthorizedException('Невалидный VK-токен')
      throw new NotFoundException('Профиль VK не найден')
    }

    const user = users[0]
    if (!user) throw new NotFoundException('Профиль VK не найден')

    const parts: string[] = []
    if (user.occupation?.name) parts.push(`Деятельность: ${user.occupation.name}`)
    if (user.career?.length) {
      const careerLines = user.career
        .map(c => [c.position, c.company].filter(Boolean).join(' в '))
        .filter(Boolean)
      if (careerLines.length) parts.push(`Карьера: ${careerLines.join('; ')}`)
    }
    if (user.bdate) parts.push(`Дата рождения: ${user.bdate}`)
    if (user.status) parts.push(`Статус: ${user.status}`)
    if (user.interests) parts.push(`Интересы: ${user.interests}`)
    if (user.about) parts.push(`О себе: ${user.about}`)

    // mobile_phone/home_phone/site появляются как плоские свойства при запросе полей 'contacts'/'site'
    const anyUser = user as unknown as Record<string, string | undefined>
    const phone = anyUser['mobile_phone']?.trim() || anyUser['home_phone']?.trim() || null
    const site  = anyUser['site']?.trim() || null

    return {
      name:     [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      bio:      parts.length ? parts.join('\n') : null,
      username: user.screen_name ?? null,
      phone,
      site,
    }
  }

  async fetchVkGroupInfo(accessToken: string, domain: string): Promise<TSocialProfile> {
    const vk = new VK({ token: accessToken })

    let response: Awaited<ReturnType<typeof vk.api.groups.getById>>
    try {
      response = await vk.api.groups.getById({
        group_ids: [domain],
        fields:    ['description', 'contacts', 'site'],
      })
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string }
      this.logger.error(`VK groups.getById failed: ${e.code ?? '?'} ${e.message ?? err}`)
      if (e.code === 5) throw new UnauthorizedException('Невалидный VK-токен')
      throw new NotFoundException('Группа VK не найдена')
    }

    const group = response.groups[0]
    if (!group) throw new NotFoundException('Группа VK не найдена')

    const parts: string[] = []
    if (group.description) parts.push(`Описание: ${group.description}`)
    if (group.site)        parts.push(`Сайт: ${group.site}`)
    if (group.contacts?.length) {
      const contactsLines = group.contacts
        .map(c => [c.desc, [c.user_id ? `id${c.user_id}` : null].filter(Boolean).join(' ')].filter(Boolean).join(': '))
        .filter(Boolean)
      if (contactsLines.length) parts.push(`Контакты: ${contactsLines.join('; ')}`)
    }

    return {
      name:     group.name ?? null,
      bio:      parts.length ? parts.join('\n') : null,
      username: group.screen_name ?? null,
    }
  }

  async fetchVkWallPosts(accessToken: string, domain: string): Promise<TVkWallPost[]> {
    const vk = new VK({ token: accessToken })
    const sinceTimestamp = Math.floor((Date.now() - WALL_POSTS_PERIOD_MS) / 1000)

    let wall: Awaited<ReturnType<typeof vk.api.wall.get>>
    try {
      wall = await vk.api.wall.get({ domain, count: 20, filter: 'owner' })
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string }
      this.logger.error(`VK wall.get failed: ${e.code ?? '?'} ${e.message ?? err}`)
      if (e.code === 5) throw new UnauthorizedException('Невалидный VK-токен')
      if (e.code === 15) throw new BadRequestException('Стена закрыта настройками приватности')
      throw new NotFoundException('Стена VK не найдена')
    }

    return wall.items
      .filter(item => item.date >= sinceTimestamp && !Number(item.marked_as_ads) && item.text?.trim())
      .map(item => ({
        text:     item.text,
        date:     item.date,
        likes:    Number(item.likes?.count ?? 0),
        reposts:  Number(item.reposts?.count ?? 0),
        comments: Number(item.comments?.count ?? 0),
      }))
  }

  async fetchTelegramGroup(encryptedSession: string, username: string): Promise<TSocialProfile> {
    const session = decrypt(encryptedSession)
    if (!session) throw new UnauthorizedException('Не удалось расшифровать Telegram-сессию')

    const apiId   = Number(this.config.get<string>('TELEGRAM_API_ID'))
    const apiHash = this.config.get<string>('TELEGRAM_API_HASH')
    if (!apiId || !apiHash) throw new BadRequestException('Telegram-интеграция не настроена на сервере')

    try {
      return await withTelegramClient(session, apiId, apiHash, async client => {
        const entity = await client.getEntity(username)
        const full = await client.invoke(new Api.channels.GetFullChannel({ channel: entity }))

        const chat = full.chats[0]
        const name = chat && 'title' in chat ? (chat as { title?: string }).title ?? null : null
        const bio  = full.fullChat && 'about' in full.fullChat ? (full.fullChat as { about?: string }).about ?? null : null

        return { name, bio, username }
      }, this.getProxyOptions())
    } catch (err: unknown) {
      const e = err as { errorMessage?: string; message?: string }
      this.logger.error(`Telegram group fetch failed: ${e.errorMessage ?? e.message ?? err}`)
      if (e.errorMessage === 'CHANNEL_INVALID' || e.errorMessage === 'USERNAME_NOT_OCCUPIED' || e.errorMessage === 'USERNAME_INVALID') {
        throw new NotFoundException('Группа/канал Telegram не найден')
      }
      if (e.errorMessage?.includes('AUTH_KEY') || e.errorMessage?.includes('SESSION')) {
        throw new UnauthorizedException('Telegram-сессия недействительна, переподключите аккаунт в настройках')
      }
      if (e.errorMessage?.startsWith('FLOOD_WAIT')) {
        throw new BadRequestException('Telegram временно ограничил запросы, попробуйте позже')
      }
      throw new NotFoundException('Не удалось получить данные группы Telegram')
    }
  }

  async fetchTelegramChannelPosts(encryptedSession: string, username: string): Promise<TTelegramPost[]> {
    const session = decrypt(encryptedSession)
    if (!session) throw new UnauthorizedException('Не удалось расшифровать Telegram-сессию')

    const apiId   = Number(this.config.get<string>('TELEGRAM_API_ID'))
    const apiHash = this.config.get<string>('TELEGRAM_API_HASH')
    if (!apiId || !apiHash) throw new BadRequestException('Telegram-интеграция не настроена на сервере')

    const sinceTimestamp = Math.floor((Date.now() - TELEGRAM_POSTS_PERIOD_MS) / 1000)

    try {
      return await withTelegramClient(session, apiId, apiHash, async client => {
        const entity = await client.getEntity(username)
        const messages = await client.getMessages(entity, { limit: 20 })

        return messages
          .filter(msg => msg.date >= sinceTimestamp && msg.message?.trim())
          .map(msg => ({
            text:  msg.message,
            date:  msg.date,
            views: (msg as unknown as { views?: number }).views ?? 0,
          }))
      }, this.getProxyOptions())
    } catch (err: unknown) {
      const e = err as { errorMessage?: string; message?: string }
      this.logger.error(`Telegram channel posts fetch failed: ${e.errorMessage ?? e.message ?? err}`)
      if (e.errorMessage === 'CHANNEL_INVALID' || e.errorMessage === 'USERNAME_NOT_OCCUPIED' || e.errorMessage === 'USERNAME_INVALID') {
        throw new NotFoundException('Группа/канал Telegram не найден')
      }
      if (e.errorMessage?.includes('AUTH_KEY') || e.errorMessage?.includes('SESSION')) {
        throw new UnauthorizedException('Telegram-сессия недействительна, переподключите аккаунт в настройках')
      }
      if (e.errorMessage?.startsWith('FLOOD_WAIT')) {
        throw new BadRequestException('Telegram временно ограничил запросы, попробуйте позже')
      }
      throw new NotFoundException('Не удалось получить посты канала Telegram')
    }
  }

  async fetchTelegramProfile(encryptedSession: string, username: string): Promise<TSocialProfile> {
    const session = decrypt(encryptedSession)
    if (!session) throw new UnauthorizedException('Не удалось расшифровать Telegram-сессию')

    const apiId   = Number(this.config.get<string>('TELEGRAM_API_ID'))
    const apiHash = this.config.get<string>('TELEGRAM_API_HASH')
    if (!apiId || !apiHash) throw new BadRequestException('Telegram-интеграция не настроена на сервере')

    try {
      return await withTelegramClient(session, apiId, apiHash, async client => {
        const entity = await client.getEntity(username)
        const full = await client.invoke(new Api.users.GetFullUser({ id: entity }))

        const user = 'users' in full.users ? full.users[0] : full.users[0]
        const firstName = user && 'firstName' in user ? user.firstName : null
        const lastName  = user && 'lastName' in user ? user.lastName : null
        const phone = user && 'phone' in user ? (user as { phone?: string }).phone?.trim() || null : null

        return {
          name:     [firstName, lastName].filter(Boolean).join(' ') || null,
          bio:      full.fullUser.about ?? null,
          username,
          phone,
        }
      }, this.getProxyOptions())
    } catch (err: unknown) {
      const e = err as { errorMessage?: string; message?: string }
      this.logger.error(`Telegram fetch failed: ${e.errorMessage ?? e.message ?? err}`)
      if (e.errorMessage === 'USERNAME_NOT_OCCUPIED' || e.errorMessage === 'USERNAME_INVALID') {
        throw new NotFoundException('Профиль Telegram не найден')
      }
      if (e.errorMessage?.includes('AUTH_KEY') || e.errorMessage?.includes('SESSION')) {
        throw new UnauthorizedException('Telegram-сессия недействительна, переподключите аккаунт в настройках')
      }
      if (e.errorMessage?.startsWith('FLOOD_WAIT')) {
        throw new BadRequestException('Telegram временно ограничил запросы, попробуйте позже')
      }
      throw new NotFoundException('Не удалось получить профиль Telegram')
    }
  }

  async fetchWebsite(url: string): Promise<TWebsiteContent> {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`

    let parsedUrl: URL
    try {
      parsedUrl = new URL(normalizedUrl)
    } catch {
      throw new BadRequestException('Некорректная ссылка на сайт')
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('Поддерживаются только http/https ссылки')
    }
    assertPublicUrlHost(parsedUrl.hostname)

    let html: string
    try {
      const response = await axios.get<string>(normalizedUrl, {
        timeout: 10_000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContactAI/1.0)' },
        responseType: 'text',
        httpAgent:  ssrfHttpAgent,
        httpsAgent: ssrfHttpsAgent,
        beforeRedirect: ssrfBeforeRedirect,
      })
      html = response.data as string
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err
      const e = err as { message?: string; response?: { status?: number } }
      this.logger.error(`Website fetch failed [${normalizedUrl}]: ${e.message ?? err}`)
      const status = e.response?.status
      if (status === 403 || status === 401) throw new BadRequestException('Сайт закрыт от автоматических запросов')
      if (status === 404) throw new NotFoundException('Страница не найдена')
      throw new BadRequestException('Не удалось загрузить сайт')
    }

    const $ = cheerio.load(html)

    // убираем теги без полезного текста
    $('script, style, noscript, iframe, nav, footer, header, aside, [aria-hidden="true"]').remove()
    $('[class*="cookie"], [id*="cookie"], [class*="banner"], [class*="popup"], [class*="modal"]').remove()

    const title = $('title').first().text().trim() || $('h1').first().text().trim() || null

    // берём main/article если есть, иначе body
    const mainEl = $('main, article, [role="main"], .content, #content, #main').first()
    const root   = mainEl.length ? mainEl : $('body')

    const text = root
      .find('h1, h2, h3, p, li, td, th, span, div')
      .map((_, el) => $(el).clone().children().remove().end().text().trim())
      .get()
      .filter(t => t.length > 20)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 6000)

    return { url: normalizedUrl, title, text }
  }
}
