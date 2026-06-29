import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContactsStore } from './contactsStore'
import { makeContact } from '@/shared/tests/factories'

vi.mock('@/shared/api', async () => ({
  ContactsService: (await import('../../tests/__mocks__/contacts.service')).default,
}))

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, showAlert: vi.fn() }
})

import { ContactsService } from '@/shared/api'
import { showAlert } from '@/shared/utils'

const apiError = new Error('API error')

beforeEach(() => {
  useContactsStore.setState({ contacts: [], loading: false })
  vi.clearAllMocks()
})

describe('contacts.store', () => {
  describe('loadContacts', () => {
    it('sets contacts from API response', async () => {
      const contacts = [makeContact({ id: '1' }), makeContact({ id: '2' })]
      vi.mocked(ContactsService.getAll).mockResolvedValue({ data: contacts } as never)

      await useContactsStore.getState().loadContacts()

      expect(useContactsStore.getState().contacts).toEqual(contacts)
    })

    it('resets loading to false on success', async () => {
      vi.mocked(ContactsService.getAll).mockResolvedValue({ data: { contacts: [] } } as never)

      await useContactsStore.getState().loadContacts()

      expect(useContactsStore.getState().loading).toBe(false)
    })

    it('resets loading to false on API failure', async () => {
      vi.mocked(ContactsService.getAll).mockRejectedValue(apiError)

      await expect(useContactsStore.getState().loadContacts()).rejects.toThrow()
      expect(useContactsStore.getState().loading).toBe(false)
    })

    it('does not mutate contacts on API failure', async () => {
      const existing = [makeContact({ id: '1' })]
      useContactsStore.setState({ contacts: existing })
      vi.mocked(ContactsService.getAll).mockRejectedValue(apiError)

      await expect(useContactsStore.getState().loadContacts()).rejects.toThrow()
      expect(useContactsStore.getState().contacts).toEqual(existing)
    })
  })

  describe('createContact', () => {
    it('prepends the new contact to the list', async () => {
      const existing = makeContact({ id: '0', full_name: 'Existing' })
      useContactsStore.setState({ contacts: [existing] })

      const created = makeContact({ id: '1', full_name: 'New' })
      vi.mocked(ContactsService.create).mockResolvedValue({ data: created } as never)

      await useContactsStore.getState().createContact({ full_name: 'New' })

      const { contacts } = useContactsStore.getState()
      expect(contacts).toHaveLength(2)
      expect(contacts[0]).toEqual(created)
      expect(contacts[1]).toEqual(existing)
    })

    it('returns the created contact', async () => {
      const created = makeContact({ id: '42' })
      vi.mocked(ContactsService.create).mockResolvedValue({ data: created } as never)

      const result = await useContactsStore.getState().createContact({})
      expect(result).toEqual(created)
    })
  })

  describe('updateContact', () => {
    it('does not mutate contacts on API failure', async () => {
      const original = makeContact({ id: '1', full_name: 'Original' })
      useContactsStore.setState({ contacts: [original] })
      vi.mocked(ContactsService.update).mockRejectedValue(apiError)

      await expect(useContactsStore.getState().updateContact('1', { full_name: 'Changed' })).rejects.toThrow()
      expect(useContactsStore.getState().contacts[0].full_name).toBe('Original')
    })

    it('replaces the matching contact in the list', async () => {
      const original = makeContact({ id: '1', full_name: 'Old Name' })
      const updated = makeContact({ id: '1', full_name: 'New Name' })
      useContactsStore.setState({ contacts: [original] })

      vi.mocked(ContactsService.update).mockResolvedValue({ data: updated } as never)

      await useContactsStore.getState().updateContact('1', { full_name: 'New Name' })

      const { contacts } = useContactsStore.getState()
      expect(contacts).toHaveLength(1)
      expect(contacts[0].full_name).toBe('New Name')
    })

    it('does not touch other contacts', async () => {
      const a = makeContact({ id: '1', full_name: 'A' })
      const b = makeContact({ id: '2', full_name: 'B' })
      const bUpdated = makeContact({ id: '2', full_name: 'B Updated' })
      useContactsStore.setState({ contacts: [a, b] })

      vi.mocked(ContactsService.update).mockResolvedValue({ data: bUpdated } as never)
      await useContactsStore.getState().updateContact('2', { full_name: 'B Updated' })

      expect(useContactsStore.getState().contacts[0].full_name).toBe('A')
    })
  })

  describe('deleteContact', () => {
    it('keeps the contact in the list on API failure', async () => {
      const contact = makeContact({ id: '1' })
      useContactsStore.setState({ contacts: [contact] })
      vi.mocked(ContactsService.delete).mockRejectedValue(apiError)

      await expect(useContactsStore.getState().deleteContact('1')).rejects.toThrow()
      expect(useContactsStore.getState().contacts).toHaveLength(1)
    })

    it('removes the deleted contact from the list', async () => {
      const a = makeContact({ id: '1' })
      const b = makeContact({ id: '2' })
      useContactsStore.setState({ contacts: [a, b] })

      vi.mocked(ContactsService.delete).mockResolvedValue(undefined as never)
      await useContactsStore.getState().deleteContact('1')

      const { contacts } = useContactsStore.getState()
      expect(contacts).toHaveLength(1)
      expect(contacts[0].id).toBe('2')
    })
  })

  describe('deleteContacts (batch)', () => {
    it('removes successfully deleted contacts from store', async () => {
      const contacts = ['1', '2', '3'].map(id => makeContact({ id }))
      useContactsStore.setState({ contacts })
      vi.mocked(ContactsService.deleteMany).mockResolvedValue({ data: { deleted: ['1', '3'], failed: [] } } as never)

      await useContactsStore.getState().deleteContacts(['1', '3'])

      const remaining = useContactsStore.getState().contacts
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('2')
    })

    it('keeps failed contacts in store on partial failure', async () => {
      const contacts = ['1', '2'].map(id => makeContact({ id }))
      useContactsStore.setState({ contacts })
      vi.mocked(ContactsService.deleteMany).mockResolvedValue({ data: { deleted: ['1'], failed: ['2'] } } as never)

      await useContactsStore.getState().deleteContacts(['1', '2'])

      const remaining = useContactsStore.getState().contacts
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('2')
    })

    it('calls deleteMany with all ids', async () => {
      useContactsStore.setState({ contacts: ['1', '2'].map(id => makeContact({ id })) })
      vi.mocked(ContactsService.deleteMany).mockResolvedValue({ data: { deleted: ['1', '2'], failed: [] } } as never)

      await useContactsStore.getState().deleteContacts(['1', '2'])
      expect(ContactsService.deleteMany).toHaveBeenCalledWith(['1', '2'])
    })

    it('shows alert when some contacts fail to delete', async () => {
      useContactsStore.setState({ contacts: ['1', '2'].map(id => makeContact({ id })) })
      vi.mocked(ContactsService.deleteMany).mockResolvedValue({ data: { deleted: ['1'], failed: ['2'] } } as never)

      await useContactsStore.getState().deleteContacts(['1', '2'])
      expect(showAlert).toHaveBeenCalled()
    })

    it('does not show alert when all contacts deleted successfully', async () => {
      useContactsStore.setState({ contacts: ['1', '2'].map(id => makeContact({ id })) })
      vi.mocked(ContactsService.deleteMany).mockResolvedValue({ data: { deleted: ['1', '2'], failed: [] } } as never)

      await useContactsStore.getState().deleteContacts(['1', '2'])
      expect(showAlert).not.toHaveBeenCalled()
    })

    it('returns result with deleted and failed arrays', async () => {
      useContactsStore.setState({ contacts: ['1', '2'].map(id => makeContact({ id })) })
      vi.mocked(ContactsService.deleteMany).mockResolvedValue({ data: { deleted: ['1'], failed: ['2'] } } as never)

      const result = await useContactsStore.getState().deleteContacts(['1', '2'])
      expect(result).toEqual({ deleted: ['1'], failed: ['2'] })
    })

    it('keeps all contacts on network failure', async () => {
      const contacts = ['1', '2'].map(id => makeContact({ id }))
      useContactsStore.setState({ contacts })
      vi.mocked(ContactsService.deleteMany).mockRejectedValue(apiError)

      await expect(useContactsStore.getState().deleteContacts(['1', '2'])).rejects.toThrow()
      expect(useContactsStore.getState().contacts).toHaveLength(2)
    })
  })

  describe('showAlert on mutation error', () => {
    it('updateContact calls showAlert on API failure', async () => {
      useContactsStore.setState({ contacts: [makeContact({ id: '1' })] })
      vi.mocked(ContactsService.update).mockRejectedValue(new Error('Ошибка обновления'))

      await expect(useContactsStore.getState().updateContact('1', {})).rejects.toThrow()
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка обновления'], btnText: 'Закрыть' },
        5000,
      )
    })

    it('deleteContact calls showAlert on API failure', async () => {
      useContactsStore.setState({ contacts: [makeContact({ id: '1' })] })
      vi.mocked(ContactsService.delete).mockRejectedValue(new Error('Ошибка удаления'))

      await expect(useContactsStore.getState().deleteContact('1')).rejects.toThrow()
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка удаления'], btnText: 'Закрыть' },
        5000,
      )
    })

    it('deleteContacts calls showAlert on network failure', async () => {
      useContactsStore.setState({ contacts: [makeContact({ id: '1' })] })
      vi.mocked(ContactsService.deleteMany).mockRejectedValue(new Error('Ошибка пакетного удаления'))

      await expect(useContactsStore.getState().deleteContacts(['1'])).rejects.toThrow()
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка пакетного удаления'], btnText: 'Закрыть' },
        5000,
      )
    })
  })

  describe('fetchContactById', () => {
    it('возвращает контакт по id', async () => {
      const contact = makeContact({ id: '1', full_name: 'Тест' })
      vi.mocked(ContactsService.getById).mockResolvedValue({ data: contact } as never)

      const result = await useContactsStore.getState().fetchContactById('1')

      expect(result).toEqual(contact)
      expect(ContactsService.getById).toHaveBeenCalledWith('1')
    })

    it('пробрасывает ошибку при сбое', async () => {
      vi.mocked(ContactsService.getById).mockRejectedValue(new Error('Not found'))
      await expect(useContactsStore.getState().fetchContactById('x')).rejects.toThrow()
    })
  })

  describe('fetchLogs', () => {
    it('возвращает логи контакта', async () => {
      const logs = [{ id: 'l1', contact_id: '1', platform: 'vk', source: null, type: 'added', changes: [], posts_analyzed: null, message: null, created_at: '2024-01-01' }]
      vi.mocked(ContactsService.getLogs).mockResolvedValue({ data: { logs } } as never)

      const result = await useContactsStore.getState().fetchLogs('1')

      expect(result).toEqual(logs)
    })

    it('пробрасывает ошибку при сбое', async () => {
      vi.mocked(ContactsService.getLogs).mockRejectedValue(new Error('fail'))
      await expect(useContactsStore.getState().fetchLogs('x')).rejects.toThrow()
    })
  })

  describe('resolveLog', () => {
    it('возвращает результат разрешения конфликта', async () => {
      const contact = makeContact({ id: '1' })
      const log = { id: 'l1', contact_id: '1', platform: 'vk', source: null, type: 'conflict', changes: [], posts_analyzed: null, message: null, created_at: '2024-01-01' }
      vi.mocked(ContactsService.resolveLog).mockResolvedValue({ data: { contact, log } } as never)

      const result = await useContactsStore.getState().resolveLog('1', 'l1', 'name', 'new')

      expect(result).toEqual({ contact, log })
    })
  })
})
