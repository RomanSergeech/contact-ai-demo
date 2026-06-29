import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { eq, and } from 'drizzle-orm'
import OpenAI from 'openai'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { AI_SYSTEM_PROMPT, ANTI_INJECTION_NOTE } from './ai.config'
import { parseJson } from '../../common/utils/parse-json'
import { encrypt, decrypt } from '../../common/utils/encrypt'
import { CONTACT_INFO_DIFF_FIELDS, normalizeContactInfoValue } from '../../common/utils/normalize-contact-info'
import type { TContactInfoDiffField } from '../../common/utils/normalize-contact-info'
import { toContact, ContactsService } from '../contacts/contacts.service'
import { ContactLogsService } from '../contacts/contact-logs.service'
import { SocialProfileService } from './social-profile.service'
import type { TVkWallPost, TTelegramPost, TWebsiteContent } from './social-profile.service'
import { VkOauthService } from '../social-auth/vk-oauth.service'
import type { TContact, TChatMessage, TImportantDate, TContactInfo, TContactPriority, TContactRelationLevel } from '../../common/types/contact.types'
import { DEFAULT_CONTACT_INFO } from '../../common/types/contact.types'
import type { TContactScrapingLog, TLogChange } from '../../common/types/contact-scraping-log.types'
import type { TTaskPriority } from '../../common/types/task.types'

type TGptMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const COMPANY_DIFF_FIELDS = [
  'company_about', 'company_size', 'company_founded', 'company_target_audience',
  'company_market', 'company_technologies',
] as const
type TCompanyDiffField = typeof COMPANY_DIFF_FIELDS[number]

const SOCIAL_DIFF_FIELDS = [
  'full_name', 'position', 'company', 'direction', 'goals', 'main_pain',
  'interests', 'dream', 'personal_traits', 'useful_to_me', 'useful_to_them', 'birth_date',
] as const
type TSocialDiffField = typeof SOCIAL_DIFF_FIELDS[number]

type TContactDetailsExtraction = Record<TContactInfoDiffField, string | null>

const parseContactDetails = (parsed: Record<string, unknown>): TContactDetailsExtraction | null => {
  const raw = parsed['contact_details']
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null

  const details = raw as Record<string, unknown>
  const detailsStr = (k: string) => typeof details[k] === 'string' && details[k] !== 'null' ? details[k] as string : null

  return {
    phone:            detailsStr('phone'),
    email:            detailsStr('email'),
    telegram_profile: detailsStr('telegram_profile'),
    telegram_group:   detailsStr('telegram_group'),
    whatsapp:         detailsStr('whatsapp'),
    instagram:        detailsStr('instagram'),
    vk_profile:       detailsStr('vk_profile'),
    vk_group:         detailsStr('vk_group'),
    personal_site:    detailsStr('personal_site'),
    company_site:     detailsStr('company_site'),
  }
}

const parseImportantDates = (parsed: Record<string, unknown>): TImportantDate[] => {
  const rawDates = Array.isArray(parsed['important_dates']) ? parsed['important_dates'] : []

  return rawDates
    .filter((d): d is { label: string; date: string } =>
      typeof d === 'object' && d !== null &&
      typeof (d as Record<string, unknown>)['label'] === 'string' &&
      typeof (d as Record<string, unknown>)['date']  === 'string',
    )
    .map(d => ({ label: d.label.trim(), date: d.date.trim() }))
}

type TContactExtraction = {
  full_name:          string
  position:           string | null
  company:            string | null
  direction:          string | null
  priority:           TContactPriority
  relationship_level: TContactRelationLevel
  goals:              string | null
  main_pain:          string | null
  interests:          string | null
  dream:              string | null
  personal_traits:    string | null
  useful_to_me:       string | null
  useful_to_them:     string | null
  contact_details:    TContactDetailsExtraction | null
  birth_date:         string | null
  last_contact:       string | null
  important_dates:    TImportantDate[]
}

const formatContactContext = (contact: TContact): string => {
  const firstName = contact.full_name.split(' ')[0]
  const lines: string[] = [`## Контакт: ${firstName}`]

  if (contact.position)           lines.push(`Должность: ${contact.position}`)
  if (contact.company)            lines.push(`Компания: ${contact.company}`)
  if (contact.direction)          lines.push(`Направление: ${contact.direction}`)
  if (contact.priority)           lines.push(`Приоритет: ${{ high: 'Высокий', medium: 'Средний', low: 'Низкий' }[contact.priority]}`)
  if (contact.relationship_level) lines.push(`Уровень отношений: ${{ cold: 'Холодный', warm: 'Тёплый', middle: 'Средний' }[contact.relationship_level]}`)
  if (contact.last_contact)       lines.push(`Последний контакт: ${contact.last_contact}`)
  if (contact.birth_date) {
    const [, month, day] = contact.birth_date.split('-')
    const monthName = new Date(0, Number(month) - 1).toLocaleString('ru-RU', { month: 'long' })
    lines.push(`День рождения: ${Number(day)} ${monthName}`)
  }
  if (contact.company_about)            lines.push(`\nО компании: ${contact.company_about}`)
  if (contact.company_founded)          lines.push(`Год основания: ${contact.company_founded}`)
  if (contact.company_size)             lines.push(`Размер компании: ${contact.company_size}`)
  if (contact.company_market)           lines.push(`Рынок: ${contact.company_market}`)
  if (contact.company_target_audience)  lines.push(`Целевая аудитория: ${contact.company_target_audience}`)
  if (contact.company_technologies)     lines.push(`Технологии: ${contact.company_technologies}`)
  if (contact.company_revenue)          lines.push(`Выручка/стадия: ${contact.company_revenue}`)
  if (contact.company_competitors)      lines.push(`Конкуренты: ${contact.company_competitors}`)

  if (contact.goals)           lines.push(`\nЦели: ${contact.goals}`)
  if (contact.main_pain)       lines.push(`Главная боль: ${contact.main_pain}`)
  if (contact.interests)       lines.push(`Интересы: ${contact.interests}`)
  if (contact.dream)           lines.push(`Мечта: ${contact.dream}`)
  if (contact.personal_traits) lines.push(`Личные характеристики: ${contact.personal_traits}`)
  if (contact.useful_to_me)    lines.push(`Чем полезен мне: ${contact.useful_to_me}`)
  if (contact.useful_to_them)  lines.push(`Чем я полезен ему/ей: ${contact.useful_to_them}`)

  if (contact.important_dates?.length) {
    lines.push(`\nВажные даты:`)
    contact.important_dates.forEach(d => lines.push(`  - ${d.label}: ${d.date}`))
  }

  return lines.join('\n')
}

const isProduction = process.env['NODE_ENV'] === 'production'
const ACTIVITY_ANALYSIS_THROTTLE_MS = 10_000

type TActivityAnalysis = {
  recent_activity_summary: string | null
  recent_topics:           string | null
  conversation_starters:   string | null
  position:                string | null
  direction:               string | null
  interests:               string | null
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  private _client: OpenAI | null = null

  constructor(
    private readonly db:                 DatabaseService,
    private readonly config:             ConfigService,
    private readonly socialProfileService: SocialProfileService,
    private readonly contactsService:    ContactsService,
    private readonly contactLogsService: ContactLogsService,
    private readonly vkOauthService:     VkOauthService,
  ) {}

  private get client(): OpenAI {
    if (!this._client) {
      this._client = new OpenAI({
        apiKey:     this.config.get<string>('OPENAI_API_KEY'),
        baseURL:    this.config.get<string>('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
        timeout:    30_000,
        maxRetries: 0,
      })
    }
    return this._client
  }

  private get modelChat(): string {
    return this.config.get<string>('OPENAI_MODEL_CHAT') ?? 'gpt-4.1'
  }

  private get modelFast(): string {
    return this.config.get<string>('OPENAI_MODEL_FAST') ?? 'gpt-4.1'
  }

  async getHistory(userId: string, contactId: string): Promise<TChatMessage[]> {
    const rows = await this.db.db.select({ chat_history: schema.contacts.chat_history })
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.user_id, userId)))
    return parseJson<TChatMessage[]>(decrypt(rows[0]?.chat_history ?? null), [])
  }

  async chat(userId: string, contactId: string, message: string): Promise<string> {
    const [userRows, contactRows] = await Promise.all([
      this.db.db.select().from(schema.users).where(eq(schema.users.id, userId)),
      this.db.db.select().from(schema.contacts)
        .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.user_id, userId))),
    ])

    if (!contactRows[0]) throw new NotFoundException('Контакт не найден')

    const contact = toContact(contactRows[0])

    const decryptedPrompt = decrypt(userRows[0]?.ai_system_prompt ?? null)?.trim()
    const userPromptSection = decryptedPrompt
      ? `## Контекст пользователя\n${decryptedPrompt}`
      : null

    const systemContent = [AI_SYSTEM_PROMPT, userPromptSection, formatContactContext(contact)]
      .filter(Boolean).join('\n\n')

    const history: TGptMessage[] = contact.chat_history.map(m => ({ role: m.role, content: m.content }))

    try {
      const completion = await this.client.chat.completions.create({
        model:                 this.modelChat,
        messages:              [{ role: 'system', content: systemContent }, ...history, { role: 'user', content: message }],
        temperature:           0.6,
        max_completion_tokens: 2000,
      })

      const text = completion.choices[0]?.message.content ?? ''
      const now  = new Date().toISOString()

      const newHistory: TChatMessage[] = ([
        ...contact.chat_history,
        { id: `${Date.now()}`,     role: 'user'      as const, content: message, createdAt: now },
        { id: `${Date.now() + 1}`, role: 'assistant' as const, content: text,    createdAt: now },
      ] as TChatMessage[]).slice(-50)

      await this.db.db.update(schema.contacts)
        .set({ chat_history: encrypt(JSON.stringify(newHistory)) })
        .where(eq(schema.contacts.id, contactId))

      return text
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      this.logger.error(`AI chat request failed: ${e.status ?? '?'} ${e.message ?? err}`)
      if (e.status === 408 || e.message?.includes('timeout')) {
        throw new ServiceUnavailableException('AI сервис не отвечает, попробуйте позже')
      }
      throw new ServiceUnavailableException('Ошибка AI сервиса')
    }
  }

  async generateTaskMeta(_userId: string, description: string) {
    const today = new Date().toISOString().slice(0, 10)

    const systemPrompt = `Ты помощник по управлению задачами. На основе текста определи метаданные задачи.
Сегодняшняя дата: ${today}.

Ответь строго в формате JSON (без markdown-блока):
{
  "title": "заголовок до 90 символов, без кавычек и точки в конце",
  "priority": "high" | "medium" | "low",
  "deadline": "YYYY-MM-DD" | null
}

Правила:
- priority=high если задача критична или срочна
- priority=medium по умолчанию
- priority=low для задач мониторинга
- deadline: установи реалистичный срок (через 3-14 дней) если задача конкретна и срочна, иначе null
${ANTI_INJECTION_NOTE}`

    let completion: Awaited<ReturnType<typeof this.client.chat.completions.create>>
    try {
      completion = await this.client.chat.completions.create({
        model:                 this.modelFast,
        messages:              [{ role: 'system', content: systemPrompt }, { role: 'user', content: description }],
        temperature:           0.3,
        max_completion_tokens: 150,
      })
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      this.logger.error(`AI task-meta request failed: ${e.status ?? '?'} ${e.message ?? err}`)
      throw new ServiceUnavailableException('Ошибка AI сервиса')
    }

    const raw = completion.choices[0]?.message.content?.trim() ?? '{}'
    let parsed: { title?: string; priority?: string; deadline?: string | null } = {}
    try { parsed = JSON.parse(raw) } catch { /* запасной вариант */ }

    const VALID_PRIORITIES = new Set(['low', 'medium', 'high'])
    const priority = VALID_PRIORITIES.has(parsed.priority ?? '')
      ? parsed.priority as TTaskPriority
      : 'medium' as const

    return { title: parsed.title ?? 'Задача из ИИ', priority, deadline: parsed.deadline ?? null }
  }

  async parseContactFromVoice(text: string) {
    const systemPrompt = `Извлеки данные о контакте из голосового описания пользователя.
Ответь строго в формате JSON (без markdown-блока):
{
  "full_name": "Имя Фамилия",
  "position": "должность или null",
  "company": "компания или null",
  "direction": "сфера/направление деятельности или null",
  "priority": "high" | "medium" | "low",
  "relationship_level": "cold" | "warm" | "middle",
  "goals": "цели контакта или null",
  "main_pain": "главная боль/проблема или null",
  "interests": "интересы, хобби или null",
  "dream": "мечта или null",
  "personal_traits": "личные характеристики, характер или null",
  "useful_to_me": "чем контакт полезен мне или null",
  "useful_to_them": "чем я полезен контакту или null",
  "contact_details": {
    "phone": "телефон или null",
    "email": "email или null",
    "telegram_profile": "username или ссылка на Telegram или null",
    "telegram_group": "ссылка на группу/канал Telegram или null",
    "whatsapp": "номер/ссылка WhatsApp или null",
    "instagram": "username или ссылка Instagram или null",
    "vk_profile": "ссылка на личную страницу VK или null",
    "vk_group": "ссылка на группу VK или null"
  },
  "last_contact": "YYYY-MM-DD или null",
  "birth_date": "YYYY-MM-DD или null",
  "important_dates": [{"label": "название события", "date": "YYYY-MM-DD"}]
}

Правила:
- full_name обязательно; если не ясно — используй упомянутое имя
- priority=high если упомянуто «срочно», «VIP», «ключевой», «важный»
- relationship_level=warm если «знакомый», «друг», «партнёр», «коллега»
- relationship_level=middle если «клиент», «работаем», «сотрудничаем»
- last_contact: дата последнего общения/встречи в формате YYYY-MM-DD, иначе null
- birth_date: дата рождения в формате YYYY-MM-DD, иначе null; НЕ включай в important_dates
- important_dates: массив прочих событий кроме дня рождения, иначе []
- для дат без года используй текущий или ближайший год
- contact_details: заполняй только если явно упомянуты, иначе все поля null
- все остальные строковые поля null если явно не упомянуты
- пиши лаконично, сохраняй суть сказанного
${ANTI_INJECTION_NOTE}`

    let completion: Awaited<ReturnType<typeof this.client.chat.completions.create>>

    try {
      completion = await this.client.chat.completions.create({
        model:                 this.modelFast,
        messages:              [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
        temperature:           0.2,
        max_completion_tokens: 700,
      })
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      this.logger.error(`AI contact-from-voice request failed: ${e.status ?? '?'} ${e.message ?? err}`)
      throw new ServiceUnavailableException('Ошибка AI сервиса')
    }

    const raw = completion.choices[0]?.message.content?.trim() ?? '{}'
    
    return this.parseContactExtraction(raw)
  }

  private parseContactExtraction(raw: string): TContactExtraction {
    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(raw) } catch { /* запасной вариант */ }

    const str  = (k: string) => typeof parsed[k] === 'string' && parsed[k] !== 'null' ? parsed[k] as string : null
    const VALID_PRIORITIES = new Set<string>(['low', 'medium', 'high'])
    const VALID_RELATIONS  = new Set<string>(['cold', 'warm', 'middle'])

    const important_dates = parseImportantDates(parsed)

    const rawBirthDate = str('birth_date')
    const birth_date = rawBirthDate && /^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate) ? rawBirthDate : null

    const contact_details = parseContactDetails(parsed)

    const rawLastContact = str('last_contact')
    const last_contact = rawLastContact && /^\d{4}-\d{2}-\d{2}$/.test(rawLastContact) ? rawLastContact : null

    return {
      full_name:          str('full_name') ?? 'Новый контакт',
      position:           str('position'),
      company:            str('company'),
      direction:          str('direction'),
      priority:           VALID_PRIORITIES.has(String(parsed['priority'] ?? '')) ? parsed['priority'] as TContactPriority : 'medium' as TContactPriority,
      relationship_level: VALID_RELATIONS.has(String(parsed['relationship_level'] ?? '')) ? parsed['relationship_level'] as TContactRelationLevel : 'cold' as TContactRelationLevel,
      goals:              str('goals'),
      main_pain:          str('main_pain'),
      interests:          str('interests'),
      dream:              str('dream'),
      personal_traits:    str('personal_traits'),
      useful_to_me:       str('useful_to_me'),
      useful_to_them:     str('useful_to_them'),
      contact_details,
      birth_date,
      last_contact,
      important_dates,
    }
  }

  private mergeSocialFields(
    contact: TContact,
    fields: { position?: string | null; direction?: string | null; interests?: string | null },
  ): { updates: Record<string, unknown>; addedChanges: TLogChange[]; conflictChanges: TLogChange[] } {
    const updates: Record<string, unknown> = {}
    const addedChanges: TLogChange[] = []
    const conflictChanges: TLogChange[] = []

    for (const [field, newValue] of Object.entries(fields) as [string, string | null][]) {
      if (!newValue) continue
      const currentValue = (contact[field as keyof TContact] as string | null) ?? null
      if (newValue === currentValue) continue
      if (!currentValue?.trim()) {
        updates[field] = newValue
        addedChanges.push({ field, old_value: null, new_value: newValue })
      } else {
        conflictChanges.push({ field, old_value: currentValue, new_value: newValue, resolution: null })
      }
    }

    return { updates, addedChanges, conflictChanges }
  }

  private mergeContactDetails(
    contact: TContact,
    contactDetails: TContactDetailsExtraction | null,
    importantDates: TImportantDate[],
  ): { updates: Record<string, unknown>; addedChanges: TLogChange[]; conflictChanges: TLogChange[] } {
    const updates: Record<string, unknown> = {}
    const addedChanges: TLogChange[] = []
    const conflictChanges: TLogChange[] = []

    if (contactDetails) {
      const currentContactInfo = contact.contact_info ?? DEFAULT_CONTACT_INFO
      const updatedContactInfo: TContactInfo = { ...currentContactInfo }
      let contactInfoChanged = false

      for (const field of CONTACT_INFO_DIFF_FIELDS) {
        const rawValue = contactDetails[field]
        const newValue = rawValue ? normalizeContactInfoValue(field, rawValue) : null
        const currentValue = currentContactInfo[field]?.trim() || null

        if (!newValue) continue
        if (newValue === currentValue) continue

        if (!currentValue) {
          updatedContactInfo[field] = newValue
          contactInfoChanged = true
          addedChanges.push({ field: `contact_info.${field}`, old_value: null, new_value: newValue })
        } else {
          conflictChanges.push({ field: `contact_info.${field}`, old_value: currentValue, new_value: newValue, resolution: null })
        }
      }

      if (contactInfoChanged) updates['contact_info'] = updatedContactInfo
    }

    if (importantDates.length > 0) {
      const currentDates = contact.important_dates ?? []
      const existingLabels = new Set(currentDates.map(d => d.label.trim().toLowerCase()))
      const newDates = importantDates.filter(d => !existingLabels.has(d.label.trim().toLowerCase()))

      if (newDates.length > 0) {
        updates['important_dates'] = [...currentDates, ...newDates]
        newDates.forEach(d => addedChanges.push({ field: 'important_dates', old_value: null, new_value: `${d.label}: ${d.date}` }))
      }
    }

    return { updates, addedChanges, conflictChanges }
  }

  private async extractContactDetailsFromText(text: string): Promise<{
    contact_details: TContactDetailsExtraction | null
    important_dates: TImportantDate[]
    position:        string | null
    direction:       string | null
    interests:       string | null
  }> {
    if (!text.trim()) return { contact_details: null, important_dates: [], position: null, direction: null, interests: null }

    const systemPrompt = `Извлеки данные о контакте из текста описания профиля/группы в соцсети.
Ответь строго в формате JSON (без markdown-блока):
{
  "position": "должность или роль владельца или null",
  "direction": "сфера/направление деятельности или null",
  "interests": "интересы, темы, хобби или null",
  "contact_details": {
    "phone": "телефон или null",
    "email": "email или null",
    "telegram_profile": "username или ссылка на личный профиль Telegram или null",
    "telegram_group": "ссылка на группу/канал Telegram или null",
    "whatsapp": "номер/ссылка whatsapp или null",
    "instagram": "username или ссылка instagram или null",
    "vk_profile": "ссылка на личную страницу VK или null",
    "vk_group": "ссылка на группу/сообщество VK или null",
    "personal_site": "ссылка на личный сайт или null",
    "company_site": "ссылка на сайт компании или null"
  },
  "important_dates": []
}

Правила:
- заполняй поля только на основе явной информации из текста, не придумывай
- position/direction/interests: null если не упомянуты явно или не выводимы из тематики
- для telegram_profile/instagram можно указывать просто username (без @ и ссылки) — он будет преобразован в ссылку автоматически
- important_dates: если упоминаются значимые даты с конкретной датой в формате YYYY-MM-DD — добавь как { "label": "...", "date": "YYYY-MM-DD" }, иначе пустой массив
- если в тексте нет полезной информации — верни null/[] во всех полях
${ANTI_INJECTION_NOTE}`

    let completion: Awaited<ReturnType<typeof this.client.chat.completions.create>>
    try {
      completion = await this.client.chat.completions.create({
        model:                 this.modelFast,
        messages:              [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }],
        temperature:           0.2,
        max_completion_tokens: 600,
      })
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      this.logger.error(`AI extract-contact-details request failed: ${e.status ?? '?'} ${e.message ?? err}`)
      throw new ServiceUnavailableException('Ошибка AI сервиса')
    }

    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(completion.choices[0]?.message.content?.trim() ?? '{}') } catch { /* запасной вариант */ }

    const str = (k: string) => typeof parsed[k] === 'string' && parsed[k] !== 'null' ? parsed[k] as string : null
    return {
      contact_details: parseContactDetails(parsed),
      important_dates: parseImportantDates(parsed),
      position:        str('position'),
      direction:       str('direction'),
      interests:       str('interests'),
    }
  }

  async clearHistory(userId: string, contactId: string): Promise<void> {
    await this.db.db.update(schema.contacts)
      .set({ chat_history: '[]' })
      .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.user_id, userId)))
  }

  async enrichFromSocial(userId: string, contactId: string, url: string, platform: 'telegram' | 'vk', options?: { skipRateLimit?: boolean }): Promise<{ contact: TContact; logs: TContactScrapingLog[] }> {
    if (!options?.skipRateLimit) await this.socialProfileService.checkRateLimit(userId)

    const userRows = await this.db.db.select().from(schema.users).where(eq(schema.users.id, userId))
    const user = userRows[0]
    if (!user) throw new NotFoundException('Пользователь не найден')

    if (platform === 'telegram' && !user.telegram_session) throw new BadRequestException('NOT_CONNECTED')

    const contact = await this.contactsService.getById(userId, contactId)

    const logs: TContactScrapingLog[] = []

    let extraction: TContactExtraction
    let profile: Awaited<ReturnType<typeof this.socialProfileService.fetchVkProfile>>
    try {
      profile = platform === 'vk'
        ? await this.socialProfileService.fetchVkProfile(await this.vkOauthService.getValidAccessToken(userId), this.socialProfileService.extractVkId(url))
        : await this.socialProfileService.fetchTelegramProfile(user.telegram_session!, this.socialProfileService.extractTelegramUsername(url))

      const profileText = [
        profile.name     ? `Имя: ${profile.name}` : null,
        profile.username ? `Username: ${profile.username}` : null,
        profile.bio      ? `\n${profile.bio}` : null,
      ].filter(Boolean).join('\n')

      const systemPrompt = `Извлеки данные о контакте из его публичного профиля в соцсети (${platform === 'vk' ? 'VK' : 'Telegram'}).
Ответь строго в формате JSON (без markdown-блока):
{
  "full_name": "Имя Фамилия",
  "position": "должность или null",
  "company": "компания или null",
  "direction": "сфера/направление деятельности или null",
  "priority": "medium",
  "relationship_level": "cold",
  "goals": "цели контакта или null",
  "main_pain": "главная боль/проблема или null",
  "interests": "интересы, хобби или null",
  "dream": "мечта или null",
  "personal_traits": "личные характеристики, характер или null",
  "useful_to_me": "чем контакт полезен мне или null",
  "useful_to_them": "чем я полезен контакту или null",
  "contact_details": {
    "phone": "телефон или null",
    "email": "email или null",
    "telegram_profile": "username или ссылка на личный профиль Telegram или null",
    "telegram_group": "ссылка на группу/канал Telegram или null",
    "whatsapp": "номер/ссылка whatsapp или null",
    "instagram": "username или ссылка instagram или null",
    "vk_profile": "ссылка на личную страницу VK или null",
    "vk_group": "ссылка на группу/сообщество VK или null",
    "personal_site": "ссылка на личный сайт или null",
    "company_site": "ссылка на сайт компании или null"
  },
  "birth_date": "YYYY-MM-DD или null",
  "important_dates": []
}

Правила:
- full_name обязательно
- заполняй поля только на основе явной информации из профиля, не придумывай
- birth_date: только если в профиле явно указана дата рождения в формате YYYY-MM-DD, иначе null
- contact_details: заполняй только если контакт явно указал эти данные в своём профиле/описании (например, в bio есть номер телефона, email или ссылки на другие соцсети); если ничего из этого не упомянуто — все поля null
- для telegram_profile/instagram можно указывать просто username (без @ и ссылки) — он будет преобразован в ссылку автоматически
- vk_profile/vk_group заполняй только если в профиле явно упомянута ссылка на личную страницу или группу/сообщество VK (например, контакт ведёт свой канал/паблик)
- important_dates: если в профиле упоминаются значимые даты (годовщины, дни рождения близких, памятные события) с конкретной датой в формате YYYY-MM-DD — добавь их как { "label": "...", "date": "YYYY-MM-DD" }, иначе пустой массив
- все остальные строковые поля null если явно не упомянуты в профиле
- пиши лаконично
${ANTI_INJECTION_NOTE}`

      let completion: Awaited<ReturnType<typeof this.client.chat.completions.create>>
      try {
        completion = await this.client.chat.completions.create({
          model:                 this.modelFast,
          messages:              [{ role: 'system', content: systemPrompt }, { role: 'user', content: profileText || 'Профиль пуст' }],
          temperature:           0.2,
          max_completion_tokens: 700,
        })
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string }
        this.logger.error(`AI enrich-from-social request failed: ${e.status ?? '?'} ${e.message ?? err}`)
        throw new ServiceUnavailableException('Ошибка AI сервиса')
      }

      const raw = completion.choices[0]?.message.content?.trim() ?? '{}'
      extraction = this.parseContactExtraction(raw)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить профиль'
      await this.contactLogsService.create({
        contact_id: contactId,
        user_id:    userId,
        platform,
        source:     'profile',
        type:       'error',
        message,
      })
      throw err
    }

    const updates: Record<string, unknown> = {}
    const addedChanges: TLogChange[] = []
    const conflictChanges: TLogChange[] = []

    for (const field of SOCIAL_DIFF_FIELDS) {
      const newValue: string | null = extraction[field]
      const currentValue = (contact[field as keyof TContact] as string | null) ?? null

      if (!newValue) continue
      if (newValue === currentValue) continue

      if (!currentValue?.trim()) {
        updates[field] = newValue
        addedChanges.push({ field, old_value: null, new_value: newValue })
      } else {
        conflictChanges.push({ field, old_value: currentValue, new_value: newValue, resolution: null })
      }
    }

    // поля из API профиля применяются напрямую, не через LLM
    const directDetails: Partial<TContactDetailsExtraction> = {}
    if (profile.phone) {
      const normalizedPhone = normalizeContactInfoValue('phone', profile.phone)
      const currentPhone = (contact.contact_info ?? DEFAULT_CONTACT_INFO)['phone']?.trim() || null
      if (!currentPhone) directDetails['phone'] = normalizedPhone
    }
    if (profile.site) {
      const normalizedSite = normalizeContactInfoValue('personal_site', profile.site)
      const currentSite = (contact.contact_info ?? DEFAULT_CONTACT_INFO)['personal_site']?.trim() || null
      if (!currentSite) directDetails['personal_site'] = normalizedSite
    }
    if (Object.keys(directDetails).length > 0) {
      const base = extraction.contact_details ?? { phone: null, email: null, telegram_profile: null, telegram_group: null, whatsapp: null, instagram: null, vk_profile: null, vk_group: null, personal_site: null, company_site: null }
      extraction = { ...extraction, contact_details: { ...base, ...directDetails } }
    }

    const detailsResult = this.mergeContactDetails(contact, extraction.contact_details, extraction.important_dates)
    Object.assign(updates, detailsResult.updates)
    addedChanges.push(...detailsResult.addedChanges)
    conflictChanges.push(...detailsResult.conflictChanges)

    let updatedContact = contact
    if (Object.keys(updates).length > 0) {
      updatedContact = await this.contactsService.update(userId, { id: contactId, ...updates } as Parameters<typeof this.contactsService.update>[1])
    }

    if (addedChanges.length > 0) {
      logs.push(await this.contactLogsService.create({
        contact_id: contactId,
        user_id:    userId,
        platform,
        source:     'profile',
        type:       'added',
        changes:    addedChanges,
      }))
    }

    if (conflictChanges.length > 0) {
      logs.push(await this.contactLogsService.create({
        contact_id: contactId,
        user_id:    userId,
        platform,
        source:     'profile',
        type:       'conflict',
        changes:    conflictChanges,
      }))
    }

    return { contact: updatedContact, logs }
  }

  private parseActivityAnalysis(raw: string): TActivityAnalysis {
    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(raw) } catch { /* запасной вариант */ }

    const str = (k: string) => typeof parsed[k] === 'string' && parsed[k] !== 'null' ? parsed[k] as string : null

    return {
      recent_activity_summary: str('recent_activity_summary'),
      recent_topics:           str('recent_topics'),
      conversation_starters:   str('conversation_starters'),
      position:                str('position'),
      direction:               str('direction'),
      interests:               str('interests'),
    }
  }

  async analyzeRecentActivity(userId: string, contactId: string, source: 'profile' | 'group', options?: { skipRateLimit?: boolean }): Promise<{ contact: TContact; logs: TContactScrapingLog[] }> {
    if (!options?.skipRateLimit) await this.socialProfileService.checkRateLimit(userId)

    const contact = await this.contactsService.getById(userId, contactId)

    if (contact.last_vk_analysis_at) {
      const elapsed = Date.now() - new Date(contact.last_vk_analysis_at).getTime()
      if (elapsed < ACTIVITY_ANALYSIS_THROTTLE_MS) {
        throw new BadRequestException('Анализ активности доступен не чаще одного раза в 10 секунд')
      }
    }

    const url = (source === 'profile' ? contact.contact_info?.vk_profile : contact.contact_info?.vk_group)?.trim() || null
    if (!url) throw new BadRequestException(source === 'profile' ? 'Укажите ссылку на личную страницу VK' : 'Укажите ссылку на группу VK')

    const accessToken = await this.vkOauthService.getValidAccessToken(userId)

    const posts: (TVkWallPost & { source: string })[] = []
    try {
      const items = await this.socialProfileService.fetchVkWallPosts(accessToken, this.socialProfileService.extractVkId(url))
      posts.push(...items.map(p => ({ ...p, source: source === 'profile' ? 'личная страница' : 'группа' })))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить посты со стены VK'
      await this.contactLogsService.create({ contact_id: contactId, user_id: userId, platform: 'vk', source, type: 'error', message })
      throw err
    }

    const logs: TContactScrapingLog[] = []

    let contactForPosts = contact

    if (source === 'group') {
      try {
        const groupInfo = await this.socialProfileService.fetchVkGroupInfo(accessToken, this.socialProfileService.extractVkId(url))
        const groupText = [groupInfo.name ? `Название: ${groupInfo.name}` : null, groupInfo.bio ? `\n${groupInfo.bio}` : null].filter(Boolean).join('\n')
        const { contact_details, important_dates, position, direction, interests } = await this.extractContactDetailsFromText(groupText)
        const detailsResult = this.mergeContactDetails(contact, contact_details, important_dates)
        const socialResult  = this.mergeSocialFields(contact, { position, direction, interests })

        const allUpdates   = { ...detailsResult.updates, ...socialResult.updates }
        const allAdded     = [...detailsResult.addedChanges, ...socialResult.addedChanges]
        const allConflicts = [...detailsResult.conflictChanges, ...socialResult.conflictChanges]

        if (Object.keys(allUpdates).length > 0) {
          await this.contactsService.update(userId, { id: contactId, ...allUpdates } as Parameters<typeof this.contactsService.update>[1])
          contactForPosts = await this.contactsService.getById(userId, contactId)
        }

        if (allAdded.length > 0) {
          logs.push(await this.contactLogsService.create({
            contact_id: contactId, user_id: userId, platform: 'vk', source, type: 'added', changes: allAdded,
          }))
        }

        if (allConflicts.length > 0) {
          logs.push(await this.contactLogsService.create({
            contact_id: contactId, user_id: userId, platform: 'vk', source, type: 'conflict', changes: allConflicts,
          }))
        }
      } catch (err) {
        this.logger.warn(`Не удалось извлечь данные из описания группы VK: ${err instanceof Error ? err.message : err}`)
      }
    }

    if (!posts.length) {
      await this.db.db.update(schema.contacts)
        .set({ last_vk_analysis_at: new Date() })
        .where(eq(schema.contacts.id, contactId))

      logs.push(await this.contactLogsService.create({
        contact_id: contactId,
        user_id:    userId,
        platform:   'vk',
        source,
        type:       'no_changes',
        message:    'За последнюю неделю новых постов не найдено',
      }))

      return { contact: await this.contactsService.getById(userId, contactId), logs }
    }

    posts.sort((a, b) => b.date - a.date)

    const postsText = posts
      .map(p => `[${p.source}, ${new Date(p.date * 1000).toLocaleDateString('ru-RU')}, лайков: ${p.likes}]\n${p.text}`)
      .join('\n---\n')

    const systemPrompt = `Проанализируй посты со стены VK контакта за последнюю неделю и сделай вывод о его текущей жизни.
Ответь строго в формате JSON (без markdown-блока):
{
  "recent_activity_summary": "краткая сводка, чем человек занимался/жил последнюю неделю, или null",
  "recent_topics": "темы, интересы, увлечения, события, всплывшие в постах, или null",
  "conversation_starters": "2-3 повода для разговора на основе постов, или null",
  "position": "должность/роль, если явно упомянута в постах, или null",
  "direction": "сфера/направление деятельности, если явно выводимо из тематики постов, или null",
  "interests": "интересы и хобби, выводимые из тематики постов, или null"
}

Правила:
- опирайся только на содержание постов, не придумывай
- пиши лаконично, по делу
- position/direction/interests: заполняй только если явно следует из постов
- если постов недостаточно для выводов — верни null в соответствующем поле
${ANTI_INJECTION_NOTE}`

    let completion: Awaited<ReturnType<typeof this.client.chat.completions.create>>
    try {
      completion = await this.client.chat.completions.create({
        model:                 this.modelFast,
        messages:              [{ role: 'system', content: systemPrompt }, { role: 'user', content: postsText }],
        temperature:           0.3,
        max_completion_tokens: 800,
      })
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      this.logger.error(`AI analyze-activity request failed: ${e.status ?? '?'} ${e.message ?? err}`)
      throw new ServiceUnavailableException('Ошибка AI сервиса')
    }

    const raw      = completion.choices[0]?.message.content?.trim() ?? '{}'
    const analysis = this.parseActivityAnalysis(raw)

    const addedChanges: TLogChange[] = []
    const conflictChanges: TLogChange[] = []
    const updates: Record<string, string | null> = {}

    const ACTIVITY_FIELDS = ['recent_activity_summary', 'recent_topics', 'conversation_starters'] as const
    for (const field of ACTIVITY_FIELDS) {
      const newValue = analysis[field]
      if (!newValue) continue

      const oldValue = contactForPosts[field]
      if (newValue === oldValue) continue

      if (!oldValue?.trim()) {
        updates[field] = newValue
        addedChanges.push({ field, old_value: null, new_value: newValue })
      } else {
        conflictChanges.push({ field, old_value: oldValue, new_value: newValue, resolution: null })
      }
    }

    const socialResult = this.mergeSocialFields(contactForPosts, {
      position:  analysis.position,
      direction: analysis.direction,
      interests: analysis.interests,
    })
    addedChanges.push(...socialResult.addedChanges)
    conflictChanges.push(...socialResult.conflictChanges)

    // activity-поля хранятся зашифрованными → прямой UPDATE в DB
    const dbUpdates: Record<string, string | Date | null> = { last_vk_analysis_at: new Date() }
    for (const [field, value] of Object.entries(updates)) dbUpdates[field] = encrypt(value)
    await this.db.db.update(schema.contacts).set(dbUpdates).where(eq(schema.contacts.id, contactId))

    // position/direction/interests — plain text, обновляем через service
    if (Object.keys(socialResult.updates).length > 0) {
      await this.contactsService.update(userId, { id: contactId, ...socialResult.updates } as Parameters<typeof this.contactsService.update>[1])
    }

    if (addedChanges.length > 0 || conflictChanges.length === 0) {
      logs.push(await this.contactLogsService.create({
        contact_id: contactId,
        user_id:    userId,
        platform:   'vk',
        source,
        type:       addedChanges.length > 0 ? 'added' : 'no_changes',
        posts_analyzed: posts.length,
        changes:    addedChanges,
        message:    addedChanges.length > 0 ? null : 'Новых данных по постам за последнюю неделю не обнаружено',
      }))
    }

    if (conflictChanges.length > 0) {
      logs.push(await this.contactLogsService.create({
        contact_id: contactId,
        user_id:    userId,
        platform:   'vk',
        source,
        type:       'conflict',
        posts_analyzed: posts.length,
        changes:    conflictChanges,
      }))
    }

    return { contact: await this.contactsService.getById(userId, contactId), logs }
  }

  async scrapeVkProfile(userId: string, contactId: string): Promise<{ contact: TContact; logs: TContactScrapingLog[] }> {
    await this.socialProfileService.checkRateLimit(userId)

    const contact = await this.contactsService.getById(userId, contactId)
    const url = contact.contact_info?.vk_profile?.trim() || null
    if (!url) throw new BadRequestException('Укажите ссылку на личную страницу VK')

    const enrichResult = await this.enrichFromSocial(userId, contactId, url, 'vk', { skipRateLimit: true })

    let contactResult = enrichResult.contact
    let logs = enrichResult.logs

    try {
      const activityResult = await this.analyzeRecentActivity(userId, contactId, 'profile', { skipRateLimit: true })
      contactResult = activityResult.contact
      logs = [...logs, ...activityResult.logs]
    } catch (err) {
      if (!(err instanceof BadRequestException)) throw err
    }

    return { contact: contactResult, logs }
  }

  async scrapeTelegramProfile(userId: string, contactId: string): Promise<{ contact: TContact; logs: TContactScrapingLog[] }> {
    await this.socialProfileService.checkRateLimit(userId)

    const contact = await this.contactsService.getById(userId, contactId)
    const url = contact.contact_info?.telegram_profile?.trim() || null
    if (!url) throw new BadRequestException('Укажите ссылку на профиль Telegram')

    const result = await this.enrichFromSocial(userId, contactId, url, 'telegram', { skipRateLimit: true })

    await this.db.db.update(schema.contacts)
      .set({ last_tg_analysis_at: new Date() })
      .where(eq(schema.contacts.id, contactId))

    return { contact: await this.contactsService.getById(userId, contactId), logs: result.logs }
  }

  async enrichTelegramGroup(userId: string, contactId: string): Promise<{ contact: TContact; logs: TContactScrapingLog[] }> {
    await this.socialProfileService.checkRateLimit(userId)

    const userRows = await this.db.db.select().from(schema.users).where(eq(schema.users.id, userId))
    const user = userRows[0]
    if (!user) throw new NotFoundException('Пользователь не найден')
    if (!user.telegram_session) throw new BadRequestException('NOT_CONNECTED')

    const contact = await this.contactsService.getById(userId, contactId)
    const url = contact.contact_info?.telegram_group?.trim() || null
    if (!url) throw new BadRequestException('Укажите ссылку на группу/канал Telegram')

    const username = this.socialProfileService.extractTelegramUsername(url)
    const logs: TContactScrapingLog[] = []

    // 1. Описание канала → контактные данные и поля профиля
    try {
      const groupInfo = await this.socialProfileService.fetchTelegramGroup(user.telegram_session, username)
      const groupText = [groupInfo.name ? `Название: ${groupInfo.name}` : null, groupInfo.bio ? `\n${groupInfo.bio}` : null].filter(Boolean).join('\n')
      const { contact_details, important_dates, position, direction, interests } = await this.extractContactDetailsFromText(groupText)
      const detailsResult = this.mergeContactDetails(contact, contact_details, important_dates)
      const socialResult  = this.mergeSocialFields(contact, { position, direction, interests })

      const allUpdates    = { ...detailsResult.updates, ...socialResult.updates }
      const allAdded      = [...detailsResult.addedChanges, ...socialResult.addedChanges]
      const allConflicts  = [...detailsResult.conflictChanges, ...socialResult.conflictChanges]

      if (Object.keys(allUpdates).length > 0) {
        await this.contactsService.update(userId, { id: contactId, ...allUpdates } as Parameters<typeof this.contactsService.update>[1])
      }

      if (allAdded.length > 0) {
        logs.push(await this.contactLogsService.create({
          contact_id: contactId, user_id: userId, platform: 'telegram', source: 'group', type: 'added', changes: allAdded,
        }))
      }

      if (allConflicts.length > 0) {
        logs.push(await this.contactLogsService.create({
          contact_id: contactId, user_id: userId, platform: 'telegram', source: 'group', type: 'conflict', changes: allConflicts,
        }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить данные группы Telegram'
      await this.contactLogsService.create({ contact_id: contactId, user_id: userId, platform: 'telegram', source: 'group', type: 'error', message })
      throw err
    }

    // 2. Посты канала за последнюю неделю → анализ активности
    let posts: TTelegramPost[] = []
    try {
      posts = await this.socialProfileService.fetchTelegramChannelPosts(user.telegram_session, username)
    } catch (err) {
      this.logger.warn(`Не удалось получить посты канала Telegram: ${err instanceof Error ? err.message : err}`)
    }

    if (!posts.length) {
      logs.push(await this.contactLogsService.create({
        contact_id: contactId, user_id: userId, platform: 'telegram', source: 'group', type: 'no_changes',
        message: 'За последнюю неделю новых постов не найдено',
      }))
      return { contact: await this.contactsService.getById(userId, contactId), logs }
    }

    posts.sort((a, b) => b.date - a.date)

    const postsText = posts
      .map(p => `[${new Date(p.date * 1000).toLocaleDateString('ru-RU')}, просмотров: ${p.views}]\n${p.text}`)
      .join('\n---\n')

    const systemPrompt = `Проанализируй посты Telegram-канала за последнюю неделю и сделай вывод о деятельности контакта.
Ответь строго в формате JSON (без markdown-блока):
{
  "tg_activity_summary": "краткая сводка, о чём пишут в канале последнюю неделю, или null",
  "tg_recent_topics": "темы, интересы, направления, всплывшие в постах, или null",
  "tg_conversation_starters": "2-3 повода для разговора на основе постов, или null"
}

Правила:
- опирайся только на содержание постов, не придумывай
- пиши лаконично, по делу
- если постов недостаточно для выводов — верни null в соответствующем поле
${ANTI_INJECTION_NOTE}`

    let completion: Awaited<ReturnType<typeof this.client.chat.completions.create>>
    try {
      completion = await this.client.chat.completions.create({
        model:                 this.modelFast,
        messages:              [{ role: 'system', content: systemPrompt }, { role: 'user', content: postsText }],
        temperature:           0.3,
        max_completion_tokens: 700,
      })
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      this.logger.error(`AI telegram-group-posts request failed: ${e.status ?? '?'} ${e.message ?? err}`)
      throw new ServiceUnavailableException('Ошибка AI сервиса')
    }

    const raw = completion.choices[0]?.message.content?.trim() ?? '{}'
    let parsedRaw: Record<string, unknown> = {}
    try { parsedRaw = JSON.parse(raw) } catch { /* запасной вариант */ }
    const strVal = (k: string) => typeof parsedRaw[k] === 'string' && parsedRaw[k] !== 'null' ? parsedRaw[k] as string : null
    const analysis = {
      tg_activity_summary:      strVal('tg_activity_summary'),
      tg_recent_topics:         strVal('tg_recent_topics'),
      tg_conversation_starters: strVal('tg_conversation_starters'),
    }

    const addedChanges: TLogChange[]    = []
    const conflictChanges: TLogChange[] = []
    const updates: Record<string, string | null> = {}

    const freshContact = await this.contactsService.getById(userId, contactId)
    const ACTIVITY_FIELDS = ['tg_activity_summary', 'tg_recent_topics', 'tg_conversation_starters'] as const
    for (const field of ACTIVITY_FIELDS) {
      const newValue = analysis[field]
      if (!newValue) continue

      const oldValue = freshContact[field]
      if (newValue === oldValue) continue

      if (!oldValue?.trim()) {
        updates[field] = newValue
        addedChanges.push({ field, old_value: null, new_value: newValue })
      } else {
        conflictChanges.push({ field, old_value: oldValue, new_value: newValue, resolution: null })
      }
    }

    if (Object.keys(updates).length > 0) {
      const dbUpdates: Record<string, string | null> = {}
      for (const [field, value] of Object.entries(updates)) dbUpdates[field] = encrypt(value)
      await this.db.db.update(schema.contacts).set(dbUpdates).where(eq(schema.contacts.id, contactId))
    }

    if (addedChanges.length > 0 || conflictChanges.length === 0) {
      logs.push(await this.contactLogsService.create({
        contact_id:     contactId,
        user_id:        userId,
        platform:       'telegram',
        source:         'group',
        type:           addedChanges.length > 0 ? 'added' : 'no_changes',
        posts_analyzed: posts.length,
        changes:        addedChanges,
        message:        addedChanges.length > 0 ? null : 'Новых данных по постам за последнюю неделю не обнаружено',
      }))
    }

    if (conflictChanges.length > 0) {
      logs.push(await this.contactLogsService.create({
        contact_id:     contactId,
        user_id:        userId,
        platform:       'telegram',
        source:         'group',
        type:           'conflict',
        posts_analyzed: posts.length,
        changes:        conflictChanges,
      }))
    }

    await this.db.db.update(schema.contacts)
      .set({ last_tg_analysis_at: new Date() })
      .where(eq(schema.contacts.id, contactId))

    return { contact: await this.contactsService.getById(userId, contactId), logs }
  }

  async scrapeWebsite(userId: string, contactId: string, field: 'personal_site' | 'company_site'): Promise<{ contact: TContact; logs: TContactScrapingLog[] }> {
    await this.socialProfileService.checkRateLimit(userId)

    const contact = await this.contactsService.getById(userId, contactId)
    const url = contact.contact_info?.[field]?.trim() || null
    if (!url) throw new BadRequestException(field === 'personal_site' ? 'Укажите ссылку на личный сайт' : 'Укажите ссылку на сайт компании')

    const platform = 'website' as const
    const logs: TContactScrapingLog[] = []

    let website: TWebsiteContent
    try {
      website = await this.socialProfileService.fetchWebsite(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить сайт'
      logs.push(await this.contactLogsService.create({ contact_id: contactId, user_id: userId, platform, type: 'error', message }))
      throw err
    }

    if (!website.text.trim()) {
      logs.push(await this.contactLogsService.create({ contact_id: contactId, user_id: userId, platform, type: 'no_changes', message: 'Сайт не содержит текстового контента' }))
      return { contact, logs }
    }

    const isCompanySite = field === 'company_site'
    const label = isCompanySite ? 'сайта компании' : 'личного сайта'

    const systemPrompt = `Извлеки данные о контакте из текста ${label}.
Ответь строго в формате JSON (без markdown-блока):
{
  "position": "должность/роль владельца или null",
  "company": "название компании или null",
  "direction": "сфера/направление деятельности или null",
  "interests": "темы, которыми занимается контакт, или null",
  ${isCompanySite ? `"company_about": "краткое резюме страницы О нас / описания компании или null",
  "company_size": "количество сотрудников или диапазон (например: 10-50, ~200, 500+) или null",
  "company_founded": "год основания (только число, например 2015) или null",
  "company_target_audience": "целевая аудитория компании или null",
  "company_market": "рынок и география (например: B2B, Россия и СНГ) или null",
  "company_technologies": "технологии, стек, инструменты или null",` : ''}
  "contact_details": {
    "phone": "телефон или null",
    "email": "email или null",
    "telegram_profile": "username или ссылка Telegram или null",
    "telegram_group": "ссылка на группу/канал Telegram или null",
    "whatsapp": "номер/ссылка WhatsApp или null",
    "instagram": "username или ссылка Instagram или null",
    "vk_profile": "ссылка на личную страницу VK или null",
    "vk_group": "ссылка на группу VK или null",
    "personal_site": null,
    "company_site": ${!isCompanySite ? '"ссылка на сайт компании если упомянута, или null"' : 'null'}
  }
}

Правила:
- заполняй только на основе явной информации, не придумывай
- если в тексте нет полезной информации — верни null во всех полях
- пиши лаконично
${ANTI_INJECTION_NOTE}`

    const userContent = [website.title ? `Заголовок: ${website.title}` : null, website.text].filter(Boolean).join('\n\n')

    let completion: Awaited<ReturnType<typeof this.client.chat.completions.create>>
    try {
      completion = await this.client.chat.completions.create({
        model:                 this.modelFast,
        messages:              [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
        temperature:           0.2,
        max_completion_tokens: 800,
      })
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      this.logger.error(`AI scrape-website request failed: ${e.status ?? '?'} ${e.message ?? err}`)
      throw new ServiceUnavailableException('Ошибка AI сервиса')
    }

    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(completion.choices[0]?.message.content?.trim() ?? '{}') } catch { /* запасной вариант */ }

    const str = (k: string) => typeof parsed[k] === 'string' && parsed[k] !== 'null' ? parsed[k] as string : null

    const updates: Record<string, unknown> = {}
    const addedChanges: TLogChange[] = []
    const conflictChanges: TLogChange[] = []

    for (const f of ['position', 'company', 'direction', 'interests'] as const) {
      const newValue = str(f)
      if (!newValue) continue
      const currentValue = (contact[f] as string | null) ?? null
      if (newValue === currentValue) continue
      if (!currentValue?.trim()) {
        updates[f] = newValue
        addedChanges.push({ field: f, old_value: null, new_value: newValue })
      } else {
        conflictChanges.push({ field: f, old_value: currentValue, new_value: newValue, resolution: null })
      }
    }

    if (isCompanySite) {
      for (const f of COMPANY_DIFF_FIELDS) {
        const newValue = str(f)
        if (!newValue) continue
        const currentValue = (contact[f as TCompanyDiffField] as string | null) ?? null
        if (newValue === currentValue) continue
        if (!currentValue?.trim()) {
          updates[f] = newValue
          addedChanges.push({ field: f, old_value: null, new_value: newValue })
        } else {
          conflictChanges.push({ field: f, old_value: currentValue, new_value: newValue, resolution: null })
        }
      }
    }

    const contactDetails = parseContactDetails(parsed)
    const detailsResult  = this.mergeContactDetails(contact, contactDetails, [])
    Object.assign(updates, detailsResult.updates)
    addedChanges.push(...detailsResult.addedChanges)
    conflictChanges.push(...detailsResult.conflictChanges)

    let updatedContact = contact
    if (Object.keys(updates).length > 0) {
      updatedContact = await this.contactsService.update(userId, { id: contactId, ...updates } as Parameters<typeof this.contactsService.update>[1])
    }

    if (addedChanges.length > 0) {
      logs.push(await this.contactLogsService.create({ contact_id: contactId, user_id: userId, platform, type: 'added', changes: addedChanges }))
    }
    if (conflictChanges.length > 0) {
      logs.push(await this.contactLogsService.create({ contact_id: contactId, user_id: userId, platform, type: 'conflict', changes: conflictChanges }))
    }
    if (addedChanges.length === 0 && conflictChanges.length === 0) {
      logs.push(await this.contactLogsService.create({ contact_id: contactId, user_id: userId, platform, type: 'no_changes', message: 'Новых данных на сайте не обнаружено' }))
    }

    return { contact: updatedContact, logs }
  }
}
