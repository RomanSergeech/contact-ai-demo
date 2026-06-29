import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoEventTasks } from './useAutoEventTasks'
import { useContactsStore, useTasksStore } from '../../store'
import { makeContact } from '@/shared/tests/factories'
import type { TContact } from '@/shared/types/contact.types'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/shared/api', async () => ({
  TasksService:    (await import('../../tests/__mocks__/tasks.service')).default,
  ContactsService: (await import('../../tests/__mocks__/contacts.service')).default,
}))

import { TasksService } from '@/shared/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Fixed "today": 2024-06-15 midnight UTC.
// TZ=UTC is set in vitest.config.ts, so new Date(year, month, day) === UTC midnight.
const TODAY = new Date('2024-06-15T00:00:00.000Z')

const makeCreatedTask = (overrides = {}) => ({
  id: 't1', user_id: 'u1', contact_id: 'c1',
  title: 'task', description: '', status: 'no_deadline' as const,
  priority: 'medium' as const, deadline: null, completed_at: null, createdAt: '2024-06-15',
  ...overrides,
})

const renderHookWithContacts = (contacts: TContact[]) => {
  useContactsStore.setState({ contacts, loading: false })
  return renderHook(() => useAutoEventTasks())
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
  localStorage.clear()
  useContactsStore.setState({ contacts: [], loading: false })
  useTasksStore.setState({ tasks: [], openedTaskId: null, loading: false })
  vi.clearAllMocks()
  vi.mocked(TasksService.create).mockResolvedValue({ data: makeCreatedTask() } as never)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutoEventTasks', () => {
  describe('does nothing', () => {
    it('skips when contacts list is empty', async () => {
      renderHook(() => useAutoEventTasks())
      await act(async () => {})
      expect(TasksService.create).not.toHaveBeenCalled()
    })

    it('skips contacts with no events', async () => {
      renderHookWithContacts([makeContact()])
      await act(async () => {})
      expect(TasksService.create).not.toHaveBeenCalled()
    })
  })

  describe('birth_date tasks', () => {
    it('creates a task when birthday is today (days=0 → status=today)', async () => {
      const contact = makeContact({ birth_date: '1990-06-15' })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).toHaveBeenCalledWith(expect.objectContaining({
        title:  `День рождения: ${contact.full_name}`,
        status: 'today',
      }))
    })

    it('creates a task when birthday is in 5 days (status=this_week)', async () => {
      const contact = makeContact({ birth_date: '1990-06-20' })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'this_week',
      }))
    })

    it('creates a task when birthday is in 7 days (status=no_deadline)', async () => {
      const contact = makeContact({ birth_date: '1990-06-22' })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'no_deadline',
      }))
    })

    it('does NOT create a task when birthday is in 22 days (outside window)', async () => {
      const contact = makeContact({ birth_date: '1990-07-07' })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).not.toHaveBeenCalled()
    })

    it('uses contact priority as task priority', async () => {
      const contact = makeContact({ birth_date: '1990-06-15', priority: 'high' })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).toHaveBeenCalledWith(expect.objectContaining({
        priority:   'high',
        contact_id: contact.id,
      }))
    })

    it('sets deadline to the birthday ISO date', async () => {
      const contact = makeContact({ birth_date: '1990-06-20' })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).toHaveBeenCalledWith(expect.objectContaining({
        deadline: '2024-06-20',
      }))
    })
  })

  describe('important_dates tasks', () => {
    it('creates a task for an important date within 21 days', async () => {
      const contact = makeContact({
        important_dates: [{ label: 'Годовщина', date: '2020-06-18' }],
      })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).toHaveBeenCalledWith(expect.objectContaining({
        title: `Годовщина — ${contact.full_name}`,
      }))
    })

    it('creates separate tasks for both birth_date and important_dates', async () => {
      const contact = makeContact({
        birth_date:      '1990-06-15',
        important_dates: [{ label: 'Годовщина', date: '2020-06-18' }],
      })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).toHaveBeenCalledTimes(2)
    })

    it('skips important dates with missing label or date', async () => {
      const contact = makeContact({
        important_dates: [
          { label: '',      date: '2020-06-18' },
          { label: 'Тест', date: '' },
        ],
      })
      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).not.toHaveBeenCalled()
    })
  })

  describe('deduplication (localStorage)', () => {
    it('does NOT create a task that was already created (key in localStorage)', async () => {
      const contact = makeContact({ birth_date: '1990-06-15' })
      const key = `${contact.id}_birth_2024`
      localStorage.setItem('contact_ai_auto_tasks_v1', JSON.stringify([key]))

      renderHookWithContacts([contact])
      await act(async () => {})

      expect(TasksService.create).not.toHaveBeenCalled()
    })

    it('saves the task key to localStorage after creation', async () => {
      const contact = makeContact({ birth_date: '1990-06-15' })
      renderHookWithContacts([contact])
      await act(async () => {})

      const stored = JSON.parse(localStorage.getItem('contact_ai_auto_tasks_v1') ?? '[]')
      expect(stored).toContain(`${contact.id}_birth_2024`)
    })
  })

  describe('run-once guard', () => {
    it('runs the effect only once per mount even when contacts change', async () => {
      const contact = makeContact({ birth_date: '1990-06-15' })
      const { rerender } = renderHookWithContacts([contact])

      await act(async () => {})
      const callsAfterMount = vi.mocked(TasksService.create).mock.calls.length

      useContactsStore.setState({ contacts: [...useContactsStore.getState().contacts] })
      rerender()
      await act(async () => {})

      expect(vi.mocked(TasksService.create).mock.calls.length).toBe(callsAfterMount)
    })
  })
})
