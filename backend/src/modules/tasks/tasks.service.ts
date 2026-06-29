import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq, and, desc } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { ContactsService } from '../contacts/contacts.service'
import { encrypt, decrypt } from '../../common/utils/encrypt'
import type { TTask, TTaskStatus, TTaskPriority } from '../../common/types/task.types'
import type { CreateTaskDto } from './dto/create-task.dto'
import type { UpdateTaskDto } from './dto/update-task.dto'

type DbTask = typeof schema.tasks.$inferSelect

const toTask = (row: DbTask): TTask => ({
  id:           row.id,
  user_id:      row.user_id,
  contact_id:   row.contact_id ?? null,
  title:        decrypt(row.title) ?? '',
  description:  decrypt(row.description ?? null) ?? '',
  status:       row.status as TTaskStatus,
  priority:     row.priority as TTaskPriority,
  deadline:     row.deadline ?? null,
  completed_at: row.completed_at ?? null,
  createdAt:    row.created_at,
})

@Injectable()
export class TasksService {
  constructor(
    private readonly db:              DatabaseService,
    private readonly contactsService: ContactsService,
  ) {}

  async getAll(userId: string): Promise<TTask[]> {
    const rows = await this.db.db.select().from(schema.tasks)
      .where(eq(schema.tasks.user_id, userId))
      .orderBy(desc(schema.tasks.created_at))
    return rows.map(toTask)
  }

  async create(userId: string, dto: CreateTaskDto): Promise<TTask> {
    if (!dto.title.trim()) throw new BadRequestException('Название обязательно')

    if (dto.contact_id) {
      const contactRows = await this.db.db.select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(and(eq(schema.contacts.id, dto.contact_id), eq(schema.contacts.user_id, userId)))
      if (!contactRows[0]) throw new NotFoundException('Контакт не найден')
    }

    const id  = crypto.randomUUID()
    const now = new Date().toISOString().slice(0, 10)

    await this.db.db.insert(schema.tasks).values({
      id,
      user_id:    userId,
      contact_id: dto.contact_id ?? undefined,
      title:      encrypt(dto.title.trim())!,
      description: encrypt(dto.description ?? ''),
      status:     dto.status ?? 'no_deadline',
      priority:   dto.priority ?? 'medium',
      deadline:   dto.deadline ?? undefined,
      created_at: now,
    })

    const rows = await this.db.db.select().from(schema.tasks).where(eq(schema.tasks.id, id))
    return toTask(rows[0]!)
  }

  async update(userId: string, dto: UpdateTaskDto): Promise<TTask> {
    const rows = await this.db.db.select().from(schema.tasks)
      .where(and(eq(schema.tasks.id, dto.id), eq(schema.tasks.user_id, userId)))

    const task = rows[0]
    if (!task) throw new NotFoundException('Задача не найдена')

    if ('contact_id' in dto && dto.contact_id != null) {
      const contactRows = await this.db.db.select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(and(eq(schema.contacts.id, dto.contact_id), eq(schema.contacts.user_id, userId)))
      if (!contactRows[0]) throw new NotFoundException('Контакт не найден')
    }

    const ALLOWED = ['title', 'description', 'status', 'priority', 'contact_id', 'deadline'] as const
    const updates: Record<string, unknown> = {}

    for (const key of ALLOWED) {
      if (key in dto) updates[key] = (dto as unknown as Record<string, unknown>)[key]
    }

    if ('title' in updates) updates['title'] = encrypt((updates['title'] as string).trim())
    if ('description' in updates) updates['description'] = encrypt(updates['description'] as string | null ?? '')

    if (dto.status === 'done' && task.status !== 'done') {
      const today = new Date().toISOString().slice(0, 10)
      updates['completed_at'] = today
      const effectiveContactId = 'contact_id' in dto ? (dto.contact_id ?? null) : task.contact_id
      if (effectiveContactId) {
        await this.contactsService.updateLastContact(userId, effectiveContactId, today)
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.db.db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, dto.id))
    }

    const updated = await this.db.db.select().from(schema.tasks).where(eq(schema.tasks.id, dto.id))
    return toTask(updated[0]!)
  }

  async delete(userId: string, id: string): Promise<void> {
    const rows = await this.db.db.select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.user_id, userId)))

    if (!rows[0]) throw new NotFoundException('Задача не найдена')
    await this.db.db.delete(schema.tasks).where(eq(schema.tasks.id, id))
  }
}
