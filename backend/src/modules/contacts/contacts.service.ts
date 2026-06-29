import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, and, isNotNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { encrypt, decrypt } from '../../common/utils/encrypt'
import { parseJson } from '../../common/utils/parse-json'
import type { TContact, TContactInfo, TImportantDate, TChatMessage, TContactPriority, TContactRelationLevel } from '../../common/types/contact.types'
import { DEFAULT_CONTACT_INFO } from '../../common/types/contact.types'
import type { TTask } from '../../common/types/task.types'
import type { CreateContactDto } from './dto/create-contact.dto'
import type { UpdateContactDto } from './dto/update-contact.dto'

type DbContact = typeof schema.contacts.$inferSelect

const extractFilename = (photo: string | null | undefined): string | null => {
  if (!photo) return null
  return photo.split('/').pop() ?? null
}

const toPhotoUrl = (filename: string | null): string | null => {
  if (!filename) return null
  const base = process.env['UPLOADS_BASE_URL'] ?? '/uploads'
  return `${base}/${filename}`
}

export const SENSITIVE_FIELDS = [
  'full_name', 'birth_date',
  'goals', 'main_pain', 'interests', 'dream',
  'personal_traits', 'useful_to_me', 'useful_to_them', 'contact_info', 'note',
  'recent_activity_summary', 'recent_topics', 'conversation_starters',
  'tg_activity_summary', 'tg_recent_topics', 'tg_conversation_starters',
] as const
type SensitiveField = typeof SENSITIVE_FIELDS[number]

const encryptSensitive = <T extends Partial<Record<SensitiveField, string | null | undefined>>>(body: T): T => {
  const result = { ...body }
  for (const field of SENSITIVE_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encrypt((result as Record<string, string | null | undefined>)[field] ?? null)
    }
  }
  return result
}

export const toContact = (row: DbContact): TContact => ({
  id:                 row.id,
  user_id:            row.user_id,
  full_name:          decrypt(row.full_name) ?? '',
  photo:              toPhotoUrl(extractFilename(row.photo ?? null)),
  position:           row.position ?? null,
  company:            row.company ?? null,
  direction:          row.direction ?? null,
  priority:           row.priority as TContactPriority,
  relationship_level: row.relationship_level as TContactRelationLevel,
  last_contact:       row.last_contact ?? null,
  birth_date:         decrypt(row.birth_date ?? null),
  goals:              decrypt(row.goals ?? null),
  main_pain:          decrypt(row.main_pain ?? null),
  interests:          decrypt(row.interests ?? null),
  dream:              decrypt(row.dream ?? null),
  personal_traits:    decrypt(row.personal_traits ?? null),
  useful_to_me:       decrypt(row.useful_to_me ?? null),
  useful_to_them:     decrypt(row.useful_to_them ?? null),
  contact_info:       parseJson<TContactInfo>(decrypt(row.contact_info ?? null), DEFAULT_CONTACT_INFO),
  note:               decrypt(row.note ?? null),
  important_dates:    parseJson<TImportantDate[]>(decrypt(row.important_dates ?? null), []),
  chat_history:       parseJson<TChatMessage[]>(decrypt(row.chat_history ?? null), []),
  recent_activity_summary:   decrypt(row.recent_activity_summary ?? null),
  recent_topics:             decrypt(row.recent_topics ?? null),
  conversation_starters:     decrypt(row.conversation_starters ?? null),
  tg_activity_summary:       decrypt(row.tg_activity_summary ?? null),
  tg_recent_topics:          decrypt(row.tg_recent_topics ?? null),
  tg_conversation_starters:  decrypt(row.tg_conversation_starters ?? null),
  company_about:             row.company_about ?? null,
  company_size:              row.company_size ?? null,
  company_founded:           row.company_founded ?? null,
  company_target_audience:   row.company_target_audience ?? null,
  company_market:            row.company_market ?? null,
  company_technologies:      row.company_technologies ?? null,
  company_revenue:           row.company_revenue ?? null,
  company_competitors:       row.company_competitors ?? null,
  company_requisites:        row.company_requisites ?? null,
  last_vk_analysis_at:       row.last_vk_analysis_at?.toISOString() ?? null,
  last_tg_analysis_at:       row.last_tg_analysis_at?.toISOString() ?? null,
  created_at:         row.created_at,
})

export const computeNextEventDate = (contact: TContact, tasks: Pick<TTask, 'id' | 'contact_id' | 'deadline' | 'status'>[]): string | null => {
  const today      = new Date().toISOString().slice(0, 10)
  const candidates: string[] = []

  tasks
    .filter(t => t.contact_id === contact.id && t.status !== 'done' && t.deadline && t.deadline >= today)
    .forEach(t => candidates.push(t.deadline!))

  const currentYear = new Date().getFullYear();
  (contact.important_dates ?? []).forEach(d => {
    if (!d.date) return
    const parts = d.date.split('-')
    if (parts.length < 3) return
    const [, month, day] = parts
    const thisYear  = `${currentYear}-${month}-${day}`
    const nextYear  = `${currentYear + 1}-${month}-${day}`
    candidates.push(thisYear >= today ? thisYear : nextYear)
  })

  return candidates.length ? (candidates.sort()[0] ?? null) : null
}

@Injectable()
export class ContactsService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(userId: string): Promise<TContact[]> {
    const [rows, taskRows] = await Promise.all([
      this.db.db.select().from(schema.contacts).where(eq(schema.contacts.user_id, userId)),
      this.db.db.select({
        id:         schema.tasks.id,
        contact_id: schema.tasks.contact_id,
        deadline:   schema.tasks.deadline,
        status:     schema.tasks.status,
      }).from(schema.tasks).where(eq(schema.tasks.user_id, userId)),
    ])

    return rows.map(row => {
      const contact = toContact(row)
      return { ...contact, next_event_date: computeNextEventDate(contact, taskRows) }
    })
  }

  async getById(userId: string, id: string): Promise<TContact> {
    const rows = await this.db.db.select().from(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.user_id, userId)))

    if (!rows[0]) throw new NotFoundException('Контакт не найден')

    const taskRows = await this.db.db.select({
      id:         schema.tasks.id,
      contact_id: schema.tasks.contact_id,
      deadline:   schema.tasks.deadline,
      status:     schema.tasks.status,
    }).from(schema.tasks).where(and(eq(schema.tasks.user_id, userId), eq(schema.tasks.contact_id, id)))

    const contact = toContact(rows[0])
    return { ...contact, next_event_date: computeNextEventDate(contact, taskRows) }
  }

  async create(userId: string, dto: CreateContactDto): Promise<TContact> {
    const id  = crypto.randomUUID()
    const now = new Date().toISOString().slice(0, 10)

    const enc = encryptSensitive({
      ...dto,
      contact_info: dto.contact_info ? JSON.stringify(dto.contact_info) : dto.contact_info,
    })

    await this.db.db.insert(schema.contacts).values({
      id,
      user_id:            userId,
      full_name:          enc.full_name,
      position:           enc.position ?? undefined,
      company:            enc.company ?? undefined,
      direction:          enc.direction ?? undefined,
      priority:           enc.priority ?? 'medium',
      relationship_level: enc.relationship_level ?? 'cold',
      last_contact:       enc.last_contact ?? undefined,
      birth_date:         enc.birth_date ?? undefined,
      goals:              enc.goals ?? undefined,
      main_pain:          enc.main_pain ?? undefined,
      interests:          enc.interests ?? undefined,
      dream:              enc.dream ?? undefined,
      personal_traits:    enc.personal_traits ?? undefined,
      useful_to_me:       enc.useful_to_me ?? undefined,
      useful_to_them:     enc.useful_to_them ?? undefined,
      contact_info:       enc.contact_info ?? undefined,
      note:               enc.note ?? undefined,
      important_dates:    encrypt(JSON.stringify(enc.important_dates ?? [])),
      chat_history:       '[]',
      created_at:         now,
    })

    return this.getById(userId, id)
  }

  async update(userId: string, dto: UpdateContactDto): Promise<TContact> {
    const { id, ...updates } = dto

    const existing = await this.db.db.select({ id: schema.contacts.id })
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.user_id, userId)))

    if (!existing[0]) throw new NotFoundException('Контакт не найден')

    const ALLOWED = [
      'full_name', 'position', 'company', 'direction',
      'priority', 'relationship_level', 'last_contact', 'birth_date',
      'goals', 'main_pain', 'interests', 'dream', 'personal_traits',
      'useful_to_me', 'useful_to_them', 'contact_info', 'note', 'important_dates',
      'recent_activity_summary', 'recent_topics', 'conversation_starters',
      'company_about', 'company_size', 'company_founded', 'company_target_audience',
      'company_market', 'company_technologies', 'company_revenue', 'company_competitors', 'company_requisites',
    ] as const

    const sanitized: Record<string, unknown> = {}
    for (const key of ALLOWED) {
      if (key in updates) {
        sanitized[key] = key === 'important_dates'
          ? encrypt(JSON.stringify((updates as Record<string, unknown>)[key] ?? []))
          : key === 'contact_info'
          ? JSON.stringify((updates as Record<string, unknown>)[key] ?? null)
          : (updates as Record<string, unknown>)[key]
      }
    }

    if (Object.keys(sanitized).length === 0) return this.getById(userId, id)

    const encrypted = encryptSensitive(sanitized as Partial<Record<SensitiveField, string | null>>)
    await this.db.db.update(schema.contacts).set(encrypted as Record<string, unknown>).where(eq(schema.contacts.id, id))

    return this.getById(userId, id)
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.db.db.select({ id: schema.contacts.id })
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.user_id, userId)))

    if (!existing[0]) throw new NotFoundException('Контакт не найден')
    await this.db.db.delete(schema.contacts).where(eq(schema.contacts.id, id))
  }

  async deleteBulk(userId: string, ids: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const results = await Promise.allSettled(ids.map(id => this.delete(userId, id)))
    const deleted: string[] = []
    const failed:  string[] = []
    ids.forEach((id, i) => (results[i].status === 'fulfilled' ? deleted : failed).push(id))
    return { deleted, failed }
  }

  async exportData(userId: string): Promise<{ contacts: TContact[]; tasks: TTask[] }> {
    const [contacts, tasks] = await Promise.all([
      this.getAll(userId),
      this.db.db.select().from(schema.tasks).where(eq(schema.tasks.user_id, userId)),
    ])
    const mappedTasks: TTask[] = tasks.map(t => ({
      ...t,
      title:       decrypt(t.title) ?? '',
      description: decrypt(t.description ?? null) ?? '',
      createdAt:   t.created_at,
    }))
    return { contacts, tasks: mappedTasks }
  }

  // Сверяем по имени файла: в БД хранится только filename, но старые записи
  // могли хранить путь (/uploads/<file>) — извлекаем имя из обоих сторон
  async userOwnsPhoto(userId: string, filename: string): Promise<boolean> {
    const rows = await this.db.db.select({ photo: schema.contacts.photo })
      .from(schema.contacts)
      .where(and(eq(schema.contacts.user_id, userId), isNotNull(schema.contacts.photo)))
    return rows.some(row => extractFilename(row.photo) === filename)
  }

  async setPhoto(userId: string, contactId: string, filename: string | null): Promise<TContact> {
    const existing = await this.db.db.select({ id: schema.contacts.id })
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.user_id, userId)))
    if (!existing[0]) throw new NotFoundException('Контакт не найден')
    await this.db.db.update(schema.contacts)
      .set({ photo: filename })
      .where(eq(schema.contacts.id, contactId))
    return this.getById(userId, contactId)
  }

  async updateLastContact(userId: string, contactId: string, date: string): Promise<void> {
    await this.db.db.update(schema.contacts)
      .set({ last_contact: date })
      .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.user_id, userId)))
  }

  async getChatHistory(contactId: string): Promise<TChatMessage[]> {
    const rows = await this.db.db.select({ chat_history: schema.contacts.chat_history })
      .from(schema.contacts).where(eq(schema.contacts.id, contactId))
    return parseJson<TChatMessage[]>(decrypt(rows[0]?.chat_history ?? null), [])
  }

  async saveChatHistory(contactId: string, history: TChatMessage[]): Promise<void> {
    await this.db.db.update(schema.contacts)
      .set({ chat_history: encrypt(JSON.stringify(history)) })
      .where(eq(schema.contacts.id, contactId))
  }

  async clearChatHistory(contactId: string): Promise<void> {
    await this.db.db.update(schema.contacts)
      .set({ chat_history: '[]' })
      .where(eq(schema.contacts.id, contactId))
  }
}
