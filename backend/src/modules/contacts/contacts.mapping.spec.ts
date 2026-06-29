import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { toContact, computeNextEventDate } from './contacts.service'
import type { TContact } from '../../common/types/contact.types'
import type { TTask } from '../../common/types/task.types'

// toContact работает с плейн-значениями: decrypt нешифрованную строку возвращает как есть,
// поэтому реальный ключ шифрования не требуется.

type DbRow = Parameters<typeof toContact>[0]

const makeRow = (overrides: Partial<Record<string, unknown>> = {}): DbRow => ({
  id:                 'c1',
  user_id:            'u1',
  full_name:          'Иван Петров',
  photo:              null,
  position:           null,
  company:            null,
  direction:          null,
  priority:           'medium',
  relationship_level: 'cold',
  last_contact:       null,
  birth_date:         null,
  goals:              null,
  main_pain:          null,
  interests:          null,
  dream:              null,
  personal_traits:    null,
  useful_to_me:       null,
  useful_to_them:     null,
  contact_info:       null,
  note:               null,
  important_dates:    null,
  chat_history:       null,
  recent_activity_summary:  null,
  recent_topics:            null,
  conversation_starters:    null,
  tg_activity_summary:      null,
  tg_recent_topics:         null,
  tg_conversation_starters: null,
  company_about:            null,
  company_size:             null,
  company_founded:          null,
  company_target_audience:  null,
  company_market:           null,
  company_technologies:     null,
  company_revenue:          null,
  company_competitors:      null,
  company_requisites:       null,
  last_vk_analysis_at:      null,
  last_tg_analysis_at:      null,
  created_at:               '2026-01-01',
  ...overrides,
}) as unknown as DbRow

describe('toContact', () => {
  it('маппит плейн-поля и подставляет дефолты для пустых JSON-полей', () => {
    const c = toContact(makeRow())
    expect(c.full_name).toBe('Иван Петров')
    expect(c.birth_date).toBeNull()
    expect(c.photo).toBeNull()
    expect(c.important_dates).toEqual([])
    expect(c.chat_history).toEqual([])
    expect(c.contact_info).toEqual(expect.objectContaining({ phone: '', email: '' }))
  })

  it('строит URL фото из имени файла (UPLOADS_BASE_URL по умолчанию /uploads)', () => {
    expect(toContact(makeRow({ photo: 'avatar.jpg' })).photo).toBe('/uploads/avatar.jpg')
  })

  it('из старого пути /uploads/<file> извлекает только имя файла', () => {
    expect(toContact(makeRow({ photo: '/uploads/old.png' })).photo).toBe('/uploads/old.png')
  })

  it('парсит contact_info из JSON-строки', () => {
    const json = JSON.stringify({ phone: '123', email: 'a@b.com', telegram_profile: '', telegram_group: '', whatsapp: '', instagram: '', vk_profile: '', vk_group: '', personal_site: '', company_site: '' })
    const c = toContact(makeRow({ contact_info: json }))
    expect(c.contact_info?.phone).toBe('123')
    expect(c.contact_info?.email).toBe('a@b.com')
  })

  it('даты анализа приводит к ISO-строке или null', () => {
    const c = toContact(makeRow({ last_vk_analysis_at: new Date('2026-05-01T10:00:00Z') }))
    expect(c.last_vk_analysis_at).toBe('2026-05-01T10:00:00.000Z')
    expect(c.last_tg_analysis_at).toBeNull()
  })
})

describe('computeNextEventDate', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-21T12:00:00Z'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  const contact = (important_dates: { label: string; date: string }[] = []): TContact =>
    ({ id: 'c1', important_dates } as unknown as TContact)

  const task = (over: Partial<TTask>): Pick<TTask, 'id' | 'contact_id' | 'deadline' | 'status'> =>
    ({ id: 't', contact_id: 'c1', deadline: null, status: 'today', ...over } as Pick<TTask, 'id' | 'contact_id' | 'deadline' | 'status'>)

  it('возвращает null, когда нет ни задач, ни дат', () => {
    expect(computeNextEventDate(contact(), [])).toBeNull()
  })

  it('берёт дедлайн будущей незавершённой задачи этого контакта', () => {
    expect(computeNextEventDate(contact(), [task({ deadline: '2026-07-01' })])).toBe('2026-07-01')
  })

  it('игнорирует задачи: завершённые, прошедшие, чужого контакта, без дедлайна', () => {
    const tasks = [
      task({ deadline: '2026-08-01', status: 'done' }),       // завершена
      task({ deadline: '2026-01-01' }),                       // прошедшая
      task({ deadline: '2026-07-15', contact_id: 'other' }),  // чужой контакт
      task({ deadline: null }),                               // без дедлайна
    ]
    expect(computeNextEventDate(contact(), tasks)).toBeNull()
  })

  it('сегодняшний дедлайн считается актуальным (>= today)', () => {
    expect(computeNextEventDate(contact(), [task({ deadline: '2026-06-21' })])).toBe('2026-06-21')
  })

  it('повторяющаяся дата в этом году, если ещё не прошла', () => {
    expect(computeNextEventDate(contact([{ label: 'ДР', date: '1990-12-25' }]), [])).toBe('2026-12-25')
  })

  it('повторяющаяся дата переносится на следующий год, если уже прошла', () => {
    expect(computeNextEventDate(contact([{ label: 'ДР', date: '1990-03-10' }]), [])).toBe('2027-03-10')
  })

  it('выбирает самое раннее из задач и дат', () => {
    const c = contact([{ label: 'ДР', date: '1990-12-25' }])
    expect(computeNextEventDate(c, [task({ deadline: '2026-07-01' })])).toBe('2026-07-01')
  })
})
