import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { ContactsService } from './contacts.service'
import { createMockDb, type MockDb } from '../../../test/helpers/mock-db'
import type { CreateContactDto } from './dto/create-contact.dto'
import type { UpdateContactDto } from './dto/update-contact.dto'

// Шифрование чувствительных полей реально вызывается в create/update.
const ENC_RE = /^v1:[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/

beforeAll(() => {
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64)
  process.env['ENCRYPTION_KEY_VERSION'] = '1'
})

let mock: MockDb
let service: ContactsService

beforeEach(() => {
  mock = createMockDb()
  service = new ContactsService(mock.service)
})

// Минимальная плейн-строка контакта для возврата из getById (после мутации).
const storedRow = (over: Record<string, unknown> = {}) => ({
  id: 'c1', user_id: 'u1', full_name: 'Иван', photo: null, position: null, company: null,
  direction: null, priority: 'medium', relationship_level: 'cold', last_contact: null,
  birth_date: null, goals: null, main_pain: null, interests: null, dream: null,
  personal_traits: null, useful_to_me: null, useful_to_them: null, contact_info: null,
  note: null, important_dates: null, chat_history: null, recent_activity_summary: null,
  recent_topics: null, conversation_starters: null, tg_activity_summary: null,
  tg_recent_topics: null, tg_conversation_starters: null, company_about: null,
  company_size: null, company_founded: null, company_target_audience: null,
  company_market: null, company_technologies: null, company_revenue: null,
  company_competitors: null, company_requisites: null, last_vk_analysis_at: null,
  last_tg_analysis_at: null, created_at: '2026-01-01', ...over,
})

describe('create', () => {
  it('шифрует чувствительные поля перед вставкой, нечувствительные оставляет как есть', async () => {
    // getById после insert: select contacts, затем select tasks
    mock.queueSelect([storedRow()])
    mock.queueSelect([])

    await service.create('u1', {
      full_name: 'Иван Петров',
      position:  'CEO',
      goals:     'Закрыть сделку',
      contact_info: { phone: '123' },
    } as unknown as CreateContactDto)

    const inserted = mock.captured.inserts[0]
    expect(inserted.full_name).toMatch(ENC_RE)      // sensitive → зашифровано
    expect(inserted.goals).toMatch(ENC_RE)          // sensitive → зашифровано
    expect(inserted.contact_info).toMatch(ENC_RE)   // sensitive JSON → зашифровано
    expect(inserted.position).toBe('CEO')           // не sensitive → как есть
    expect(inserted.chat_history).toBe('[]')        // инициализируется пустым
    expect(inserted.user_id).toBe('u1')
  })
})

describe('update (защита от mass-assignment)', () => {
  it('применяет только поля из белого списка, чужие игнорирует', async () => {
    mock.queueSelect([{ id: 'c1' }])  // проверка существования
    mock.queueSelect([storedRow()])   // getById: contacts
    mock.queueSelect([])              // getById: tasks

    await service.update('u1', {
      id:         'c1',
      position:   'CTO',
      // поля, которых нет в ALLOWED — не должны попасть в update
      user_id:    'attacker',
      role:       'admin',
      created_at: '1999-01-01',
    } as unknown as UpdateContactDto)

    const upd = mock.captured.updates[0]
    expect(upd.position).toBe('CTO')
    expect(upd).not.toHaveProperty('user_id')
    expect(upd).not.toHaveProperty('role')
    expect(upd).not.toHaveProperty('created_at')
  })

  it('шифрует sensitive-поля в update', async () => {
    mock.queueSelect([{ id: 'c1' }])
    mock.queueSelect([storedRow()])
    mock.queueSelect([])

    await service.update('u1', { id: 'c1', full_name: 'Новое Имя' } as unknown as UpdateContactDto)
    expect(mock.captured.updates[0].full_name).toMatch(ENC_RE)
  })

  it('несуществующий контакт → NotFoundException', async () => {
    mock.queueSelect([]) // existing пуст
    await expect(service.update('u1', { id: 'nope', position: 'X' } as unknown as UpdateContactDto))
      .rejects.toBeInstanceOf(NotFoundException)
  })

  it('пустой набор разрешённых полей не вызывает update', async () => {
    mock.queueSelect([{ id: 'c1' }])
    mock.queueSelect([storedRow()])
    mock.queueSelect([])

    // только запрещённые поля
    await service.update('u1', { id: 'c1', user_id: 'x' } as unknown as UpdateContactDto)
    expect(mock.captured.updates).toHaveLength(0)
  })
})

describe('getById', () => {
  it('бросает NotFoundException, если контакт не найден', async () => {
    mock.queueSelect([])
    await expect(service.getById('u1', 'missing')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('userOwnsPhoto', () => {
  it('true, если у пользователя есть контакт с этим файлом (по имени файла)', async () => {
    mock.queueSelect([{ photo: '/uploads/a.jpg' }, { photo: 'b.jpg' }])
    expect(await service.userOwnsPhoto('u1', 'b.jpg')).toBe(true)
  })

  it('false, если файла нет', async () => {
    mock.queueSelect([{ photo: 'a.jpg' }])
    expect(await service.userOwnsPhoto('u1', 'unknown.jpg')).toBe(false)
  })
})

describe('deleteBulk', () => {
  it('разделяет на удалённые и неудавшиеся (несуществующие)', async () => {
    mock.queueSelect([{ id: 'id1' }]) // delete('id1') — существует
    mock.queueSelect([])              // delete('id2') — не найден

    const res = await service.deleteBulk('u1', ['id1', 'id2'])
    expect(res.deleted).toEqual(['id1'])
    expect(res.failed).toEqual(['id2'])
  })
})
