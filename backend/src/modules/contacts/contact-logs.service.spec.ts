import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ContactLogsService } from './contact-logs.service'
import { ContactsService } from './contacts.service'
import { createMockDb, type MockDb } from '../../../test/helpers/mock-db'
import type { TLogChange } from '../../common/types/contact-scraping-log.types'

const ENC_RE = /^v1:[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/

let encrypt: (t: string | null) => string | null
let decrypt: (t: string | null) => string | null

beforeAll(async () => {
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64)
  process.env['ENCRYPTION_KEY_VERSION'] = '1'
  ;({ encrypt, decrypt } = await import('../../common/utils/encrypt'))
})

let mock: MockDb
let contactsService: { getById: ReturnType<typeof vi.fn> }
let service: ContactLogsService

const baseContact = {
  id: 'c1',
  contact_info: { phone: '', email: 'old@b.com', telegram_profile: '', telegram_group: '', whatsapp: '', instagram: '', vk_profile: '', vk_group: '', personal_site: '', company_site: '' },
}

beforeEach(() => {
  mock = createMockDb()
  contactsService = { getById: vi.fn().mockResolvedValue(baseContact) }
  service = new ContactLogsService(mock.service, contactsService as unknown as ContactsService)
})

const logRow = (changes: TLogChange[], over: Record<string, unknown> = {}) => ({
  id:             'log1',
  contact_id:     'c1',
  user_id:        'u1',
  platform:       'vk',
  source:         null,
  type:           'conflict',
  changes:        encrypt(JSON.stringify(changes)),
  posts_analyzed: null,
  message:        null,
  created_at:     new Date('2026-01-01T00:00:00Z'),
  ...over,
})

describe('resolveConflict', () => {
  it('choice=new по sensitive-полю: пишет зашифрованное новое значение в контакт', async () => {
    const changes: TLogChange[] = [{ field: 'goals', old_value: 'старое', new_value: 'новое' }]
    mock.queueSelect([logRow(changes)])              // поиск лога
    mock.queueSelect([logRow(changes)])              // повторное чтение лога после апдейта

    await service.resolveConflict('u1', 'c1', 'log1', 'goals', 'new')

    // updates[0] — апдейт контакта (goals), updates[1] — апдейт лога (changes)
    expect(mock.captured.updates[0].goals).toMatch(ENC_RE)
    expect(decrypt(mock.captured.updates[0].goals as string)).toBe('новое')
    expect(mock.captured.updates[1].changes).toMatch(ENC_RE)
  })

  it('choice=merge склеивает старое и новое через перенос строки', async () => {
    const changes: TLogChange[] = [{ field: 'interests', old_value: 'A', new_value: 'B' }]
    mock.queueSelect([logRow(changes)])
    mock.queueSelect([logRow(changes)])

    await service.resolveConflict('u1', 'c1', 'log1', 'interests', 'merge')

    expect(decrypt(mock.captured.updates[0].interests as string)).toBe('A\n\nB')
  })

  it('choice=old только помечает конфликт skipped, контакт не трогает', async () => {
    const changes: TLogChange[] = [{ field: 'goals', old_value: 'старое', new_value: 'новое' }]
    mock.queueSelect([logRow(changes)])
    mock.queueSelect([logRow(changes)])

    await service.resolveConflict('u1', 'c1', 'log1', 'goals', 'old')

    // единственный апдейт — это лог (нет апдейта контакта)
    expect(mock.captured.updates).toHaveLength(1)
    expect(mock.captured.updates[0]).toHaveProperty('changes')
    const saved = JSON.parse(decrypt(mock.captured.updates[0].changes as string)!) as TLogChange[]
    expect(saved[0].resolution).toBe('skipped')
  })

  it('конфликт по contact_info.<sub> мерджит значение в JSON contact_info', async () => {
    const changes: TLogChange[] = [{ field: 'contact_info.phone', old_value: null, new_value: '+79990001122' }]
    mock.queueSelect([logRow(changes)])
    mock.queueSelect([logRow(changes)])

    await service.resolveConflict('u1', 'c1', 'log1', 'contact_info.phone', 'new')

    const savedInfo = JSON.parse(decrypt(mock.captured.updates[0].contact_info as string)!)
    expect(savedInfo.phone).toBe('+79990001122')
    expect(savedInfo.email).toBe('old@b.com') // остальные подполя сохранены
  })

  it('лог не найден → NotFoundException', async () => {
    mock.queueSelect([])
    await expect(service.resolveConflict('u1', 'c1', 'missing', 'goals', 'new'))
      .rejects.toBeInstanceOf(NotFoundException)
  })

  it('лог не типа conflict → BadRequestException', async () => {
    const changes: TLogChange[] = [{ field: 'goals', old_value: 'a', new_value: 'b' }]
    mock.queueSelect([logRow(changes, { type: 'added' })])
    await expect(service.resolveConflict('u1', 'c1', 'log1', 'goals', 'new'))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('конфликт по полю уже разрешён → BadRequestException', async () => {
    const changes: TLogChange[] = [{ field: 'goals', old_value: 'a', new_value: 'b', resolution: 'changed' }]
    mock.queueSelect([logRow(changes)])
    await expect(service.resolveConflict('u1', 'c1', 'log1', 'goals', 'new'))
      .rejects.toBeInstanceOf(BadRequestException)
  })
})
