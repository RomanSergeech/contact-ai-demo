import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq, and, desc, notInArray } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { encrypt, decrypt } from '../../common/utils/encrypt'
import { ContactsService, SENSITIVE_FIELDS } from './contacts.service'
import type { TContact, TContactInfo } from '../../common/types/contact.types'
import { DEFAULT_CONTACT_INFO } from '../../common/types/contact.types'
import type { TContactScrapingLog, TNewContactScrapingLog, TLogChange } from '../../common/types/contact-scraping-log.types'

type DbScrapingLog = typeof schema.contactScrapingLogs.$inferSelect

const MAX_LOGS_PER_USER = 20

const RESOLVABLE_CONTACT_FIELDS = new Set([
  'full_name', 'position', 'company', 'direction', 'goals', 'main_pain',
  'interests', 'dream', 'personal_traits', 'useful_to_me', 'useful_to_them',
  'note', 'birth_date', 'last_contact', 'recent_activity_summary',
  'recent_topics', 'conversation_starters', 'tg_activity_summary',
  'tg_recent_topics', 'tg_conversation_starters', 'company_about',
  'company_size', 'company_founded', 'company_target_audience', 'company_market',
  'company_technologies', 'company_revenue', 'company_competitors', 'company_requisites',
])

const toLog = (row: DbScrapingLog): TContactScrapingLog => ({
  id:             row.id,
  contact_id:     row.contact_id,
  user_id:        row.user_id,
  platform:       row.platform,
  source:         row.source,
  type:           row.type,
  changes:        JSON.parse(decrypt(row.changes as string | null) ?? '[]') as TLogChange[],
  posts_analyzed: row.posts_analyzed,
  message:        row.message,
  created_at:     row.created_at.toISOString(),
})

@Injectable()
export class ContactLogsService {
  constructor(
    private readonly db:            DatabaseService,
    private readonly contactsService: ContactsService,
  ) {}

  async create(entry: TNewContactScrapingLog): Promise<TContactScrapingLog> {
    if (entry.type === 'conflict' && entry.changes?.length) {
      await this.skipObsoleteConflicts(entry.contact_id, entry.user_id, entry.changes.map(c => c.field))
    }

    const id = crypto.randomUUID()

    await this.db.db.insert(schema.contactScrapingLogs).values({
      id,
      contact_id:     entry.contact_id,
      user_id:        entry.user_id,
      platform:       entry.platform,
      source:         entry.source ?? null,
      type:           entry.type,
      changes:        encrypt(JSON.stringify(entry.changes ?? [])),
      posts_analyzed: entry.posts_analyzed ?? null,
      message:        entry.message ?? null,
      created_at:     new Date(),
    })

    const rows = await this.db.db.select().from(schema.contactScrapingLogs).where(eq(schema.contactScrapingLogs.id, id))

    await this.trimUserLogs(entry.user_id)

    return toLog(rows[0]!)
  }

  private async skipObsoleteConflicts(contactId: string, userId: string, incomingFields: string[]): Promise<void> {
    const fieldSet = new Set(incomingFields)

    const existing = await this.db.db.select().from(schema.contactScrapingLogs)
      .where(and(
        eq(schema.contactScrapingLogs.contact_id, contactId),
        eq(schema.contactScrapingLogs.user_id, userId),
        eq(schema.contactScrapingLogs.type, 'conflict'),
      ))

    for (const row of existing) {
      const changes = JSON.parse(decrypt(row.changes as string | null) ?? '[]') as TLogChange[]
      let modified = false

      for (const change of changes) {
        if (!change.resolution && fieldSet.has(change.field)) {
          change.resolution = 'skipped'
          modified = true
        }
      }

      if (modified) {
        await this.db.db.update(schema.contactScrapingLogs)
          .set({ changes: encrypt(JSON.stringify(changes)) })
          .where(eq(schema.contactScrapingLogs.id, row.id))
      }
    }
  }

  private async trimUserLogs(userId: string): Promise<void> {
    const kept = await this.db.db.select({ id: schema.contactScrapingLogs.id }).from(schema.contactScrapingLogs)
      .where(eq(schema.contactScrapingLogs.user_id, userId))
      .orderBy(desc(schema.contactScrapingLogs.created_at))
      .limit(MAX_LOGS_PER_USER)

    if (kept.length < MAX_LOGS_PER_USER) return

    await this.db.db.delete(schema.contactScrapingLogs)
      .where(and(
        eq(schema.contactScrapingLogs.user_id, userId),
        notInArray(schema.contactScrapingLogs.id, kept.map(row => row.id)),
      ))
  }

  async getByContactId(userId: string, contactId: string): Promise<TContactScrapingLog[]> {
    const rows = await this.db.db.select().from(schema.contactScrapingLogs)
      .where(and(eq(schema.contactScrapingLogs.contact_id, contactId), eq(schema.contactScrapingLogs.user_id, userId)))
      .orderBy(desc(schema.contactScrapingLogs.created_at))

    return rows.map(toLog)
  }

  async resolveConflict(userId: string, contactId: string, logId: string, field: string, choice: 'old' | 'new' | 'merge'): Promise<{ contact: TContact; log: TContactScrapingLog }> {
    const rows = await this.db.db.select().from(schema.contactScrapingLogs)
      .where(and(
        eq(schema.contactScrapingLogs.id, logId),
        eq(schema.contactScrapingLogs.contact_id, contactId),
        eq(schema.contactScrapingLogs.user_id, userId),
      ))

    const row = rows[0]
    if (!row) throw new NotFoundException('Запись лога не найдена')
    if (row.type !== 'conflict') throw new BadRequestException('Запись лога не содержит конфликтов')

    const changes = JSON.parse(decrypt(row.changes as string | null) ?? '[]') as TLogChange[]
    const change  = changes.find(c => c.field === field && !c.resolution)
    if (!change) throw new BadRequestException('Конфликт по этому полю не найден или уже разрешён')

    if (!field.startsWith('contact_info.') && !RESOLVABLE_CONTACT_FIELDS.has(field)) {
      throw new BadRequestException('Недопустимое поле')
    }

    if (choice === 'new' || choice === 'merge') {
      const value = choice === 'merge' && change.old_value && change.new_value
        ? `${change.old_value}\n\n${change.new_value}`
        : change.new_value

      if (field.startsWith('contact_info.')) {
        const subField = field.slice('contact_info.'.length) as keyof TContactInfo
        const contact = await this.contactsService.getById(userId, contactId)
        const contactInfo: TContactInfo = { ...(contact.contact_info ?? DEFAULT_CONTACT_INFO), [subField]: value ?? '' }

        await this.db.db.update(schema.contacts).set({ contact_info: encrypt(JSON.stringify(contactInfo)) }).where(eq(schema.contacts.id, contactId))
      } else {
        const isSensitive = (SENSITIVE_FIELDS as readonly string[]).includes(field)
        const dbValue = isSensitive ? encrypt(value) : value

        await this.db.db.update(schema.contacts).set({ [field]: dbValue }).where(eq(schema.contacts.id, contactId))
      }

      change.resolution = 'changed'
    } else {
      change.resolution = 'skipped'
    }

    await this.db.db.update(schema.contactScrapingLogs)
      .set({ changes: encrypt(JSON.stringify(changes)) })
      .where(eq(schema.contactScrapingLogs.id, logId))

    const updatedRows = await this.db.db.select().from(schema.contactScrapingLogs).where(eq(schema.contactScrapingLogs.id, logId))
    const contact = await this.contactsService.getById(userId, contactId)

    return { contact, log: toLog(updatedRows[0]!) }
  }
}
