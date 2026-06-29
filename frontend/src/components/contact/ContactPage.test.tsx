import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContactPage } from './ContactPage'
import { makeContact } from '@/shared/tests/factories'

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('@/shared/store', () => ({
  useContactsStore: vi.fn(),
  useUserStore: vi.fn(),
}))

vi.mock('@/shared/api', async () => ({
  ContactsService: (await import('../../shared/tests/__mocks__/contacts.service')).default,
}))

vi.mock('@/widgets/ai-chat/AiChat', () => ({
  AiChat: () => null,
}))

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, showAlert: vi.fn() }
})

import { useContactsStore, useUserStore } from '@/shared/store'
import { ContactsService } from '@/shared/api'
import { showAlert } from '@/shared/utils'

const mockUpdateContact = vi.fn().mockResolvedValue(undefined)
const mockDeleteContact = vi.fn().mockResolvedValue(undefined)
const mockFetchContactById = vi.fn((id: string) => ContactsService.getById(id).then(r => r.data))
const mockFetchLogs = vi.fn((id: string) => ContactsService.getLogs(id).then(r => r.data.logs))
const mockResolveLog = vi.fn((contactId: string, logId: string, field: string, choice: 'old' | 'new') =>
  ContactsService.resolveLog(contactId, logId, field, choice).then(r => r.data))

const setStore = (contacts: ReturnType<typeof makeContact>[]) => {
  const state = {
    contacts,
    updateContact: mockUpdateContact,
    deleteContact: mockDeleteContact,
    fetchContactById: mockFetchContactById,
    fetchLogs: mockFetchLogs,
    resolveLog: mockResolveLog,
  }
  vi.mocked(useContactsStore).mockImplementation((sel?: any) => sel ? sel(state) : state)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPush.mockClear()
  mockReplace.mockClear()
  setStore([makeContact({ position: 'Директор', company: 'ООО Тест', relationship_level: 'warm' })])
  const userState = { vk_connected: false, telegram_connected: false, setVkConnected: vi.fn(), disconnectVk: vi.fn() }
  const uStore: any = vi.mocked(useUserStore)
  uStore.mockImplementation((sel?: any) => sel ? sel(userState) : userState)
  uStore.getState = () => userState
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('ContactPage', () => {
  describe('loading', () => {
    it('shows loading state when contact is not in store', () => {
      setStore([])
      vi.mocked(ContactsService.getById).mockResolvedValue({ data: makeContact() } as never)
      render(<ContactPage id="c1" />)
      expect(screen.getByText('Загрузка...')).toBeInTheDocument()
    })

    it('fetches contact from API when not in store', async () => {
      setStore([])
      vi.mocked(ContactsService.getById).mockResolvedValue({ data: makeContact() } as never)
      render(<ContactPage id="c1" />)
      await waitFor(() => expect(ContactsService.getById).toHaveBeenCalledWith('c1'))
    })

    it('redirects to /main when API fetch fails', async () => {
      setStore([])
      vi.mocked(ContactsService.getById).mockRejectedValue(new Error('404'))
      render(<ContactPage id="c1" />)
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/main'))
    })
  })

  describe('rendering', () => {
    it('shows contact full_name', () => {
      render(<ContactPage id="c1" />)
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    })

    it('shows contact position', () => {
      render(<ContactPage id="c1" />)
      expect(screen.getByText('Директор')).toBeInTheDocument()
    })

    it('shows initials as avatar placeholder when no photo', () => {
      render(<ContactPage id="c1" />)
      expect(screen.getByText('ИИ')).toBeInTheDocument()
    })

    it('renders photo img when photo is set', () => {
      setStore([makeContact({ photo: 'https://example.com/photo.jpg' })])
      render(<ContactPage id="c1" />)
      expect(screen.getByAltText('Иван Иванов')).toBeInTheDocument()
    })
  })

  describe('save', () => {
    it('"Сохранить" calls updateContact with contact id', async () => {
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
      await waitFor(() => expect(mockUpdateContact).toHaveBeenCalledWith('c1', expect.any(Object)))
    })

    it('shows "Сохранение..." while saving', async () => {
      mockUpdateContact.mockImplementation(() => new Promise(() => {}))
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранение...' })).toBeInTheDocument())
    })
  })

  describe('delete', () => {
    it('"Удалить контакт" shows confirm dialog', () => {
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить контакт' }))
      expect(window.confirm).toHaveBeenCalled()
    })

    it('calls deleteContact when confirm is accepted', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить контакт' }))
      await waitFor(() => expect(mockDeleteContact).toHaveBeenCalledWith('c1'))
    })

    it('does NOT delete when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить контакт' }))
      await new Promise(r => setTimeout(r, 0))
      expect(mockDeleteContact).not.toHaveBeenCalled()
    })

    it('navigates to /main after deletion', async () => {
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить контакт' }))
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/main'))
    })
  })

  describe('back button', () => {
    it('navigates to /main when back button is clicked', () => {
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByText('Контакты'))
      expect(mockPush).toHaveBeenCalledWith('/main')
    })
  })

  describe('important dates', () => {
    it('"Добавить дату" adds an empty date row', () => {
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByText('Добавить дату'))
      expect(screen.getByPlaceholderText('Название (напр. ДР Супруги)')).toBeInTheDocument()
    })

    it('remove button deletes the date row', () => {
      setStore([makeContact({ important_dates: [{ label: 'Годовщина', date: '2020-05-01' }] })])
      render(<ContactPage id="c1" />)
      expect(screen.getByDisplayValue('Годовщина')).toBeInTheDocument()
      fireEvent.click(screen.getByTitle('Удалить'))
      expect(screen.queryByDisplayValue('Годовщина')).not.toBeInTheDocument()
    })
  })

  describe('task shortcuts', () => {
    it('"+ Добавить задачу" navigates to tasks with createFor param', () => {
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByText('+ Добавить задачу'))
      expect(mockPush).toHaveBeenCalledWith('/tasks?createFor=c1')
    })

    it('"Посмотреть задачи" navigates to tasks with contact param', () => {
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByText('Посмотреть задачи'))
      expect(mockPush).toHaveBeenCalledWith('/tasks?contact=c1')
    })
  })

  describe('delete loading state', () => {
    it('shows "Удаление..." while deleting', async () => {
      mockDeleteContact.mockImplementation(() => new Promise(() => {}))
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить контакт' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Удаление...' })).toBeInTheDocument())
    })

    it('delete button is disabled while deleting', async () => {
      mockDeleteContact.mockImplementation(() => new Promise(() => {}))
      render(<ContactPage id="c1" />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить контакт' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Удаление...' })).toBeDisabled())
    })
  })

  describe('photo upload', () => {
    const mockFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })

    it('calls uploadPhoto with the contact id and selected file', async () => {
      vi.mocked(ContactsService.uploadPhoto).mockResolvedValue({ data: { photo: 'photo.jpg' } } as never)
      render(<ContactPage id="c1" />)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [mockFile] } })
      await waitFor(() => expect(ContactsService.uploadPhoto).toHaveBeenCalledWith('c1', mockFile))
    })

    it('calls updateContact with the new photo URL after upload', async () => {
      vi.mocked(ContactsService.uploadPhoto).mockResolvedValue({ data: { photo: 'photo.jpg' } } as never)
      render(<ContactPage id="c1" />)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [mockFile] } })
      await waitFor(() =>
        expect(mockUpdateContact).toHaveBeenCalledWith('c1', expect.objectContaining({ photo: expect.stringContaining('photo.jpg') }))
      )
    })

    it('shows photo img after successful upload', async () => {
      vi.mocked(ContactsService.uploadPhoto).mockResolvedValue({ data: { photo: 'photo.jpg' } } as never)
      render(<ContactPage id="c1" />)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [mockFile] } })
      await waitFor(() => expect(screen.getByAltText('Иван Иванов')).toBeInTheDocument())
    })

    it('calls showAlert when upload fails', async () => {
      vi.mocked(ContactsService.uploadPhoto).mockRejectedValue(new Error('Upload failed'))
      render(<ContactPage id="c1" />)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [mockFile] } })
      await waitFor(() =>
        expect(showAlert).toHaveBeenCalledWith(
          { text: ['Upload failed'], btnText: 'Закрыть' },
          5000,
        )
      )
    })

    it('does not call updateContact when upload fails', async () => {
      vi.mocked(ContactsService.uploadPhoto).mockRejectedValue(new Error('Upload failed'))
      render(<ContactPage id="c1" />)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [mockFile] } })
      await waitFor(() => expect(showAlert).toHaveBeenCalled())
      expect(mockUpdateContact).not.toHaveBeenCalled()
    })

    it('does nothing when no file is selected', async () => {
      render(<ContactPage id="c1" />)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [] } })
      await new Promise(r => setTimeout(r, 0))
      expect(ContactsService.uploadPhoto).not.toHaveBeenCalled()
    })
  })
})
