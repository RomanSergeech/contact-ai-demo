import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MainPage } from './MainPage'
import { makeContact } from '@/shared/tests/factories'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

vi.mock('@/shared/store', () => ({
  useContactsStore: vi.fn(),
}))

vi.mock('@/widgets', () => ({
  Table: ({ columns, emptyData, emptyDataText, loading }: any) => (
    <div>
      {emptyData && <p>{emptyDataText ?? 'Нет данных'}</p>}
      {!loading && !emptyData && columns()}
    </div>
  ),
}))

vi.mock('./modals/CreateContactModal/CreateContactModal', () => ({
  CreateContactModal: ({ onClose }: any) => (
    <div data-testid="create-modal">
      <button onClick={onClose}>close-create</button>
    </div>
  ),
  DRAFT_KEY: 'voice_contact_draft',
}))

import { useContactsStore } from '@/shared/store'

const mockDeleteContacts = vi.fn().mockResolvedValue({ deleted: [], failed: [] })

const setStore = (contacts: ReturnType<typeof makeContact>[]) => {
  const state = { contacts, deleteContacts: mockDeleteContacts }
  vi.mocked(useContactsStore).mockImplementation((sel?: any) => sel ? sel(state) : state)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPush.mockClear()
  mockDeleteContacts.mockResolvedValue({ deleted: [], failed: [] })
  setStore([])
  localStorage.clear()
  sessionStorage.clear()
})

describe('MainPage', () => {
  describe('empty state', () => {
    it('shows empty text when there are no contacts', () => {
      render(<MainPage />)
      expect(screen.getByText('Контактов ещё нет. Добавьте первый!')).toBeInTheDocument()
    })
  })

  describe('contacts list', () => {
    it('renders contact full_name', () => {
      setStore([makeContact({ full_name: 'Алексей Смирнов' })])
      render(<MainPage />)
      expect(screen.getByText('Алексей Смирнов')).toBeInTheDocument()
    })

    it('renders multiple contacts', () => {
      setStore([
        makeContact({ id: 'c1', full_name: 'Иван Иванов' }),
        makeContact({ id: 'c2', full_name: 'Мария Петрова' }),
      ])
      render(<MainPage />)
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
      expect(screen.getByText('Мария Петрова')).toBeInTheDocument()
    })

    it('navigates to contact page on row click', () => {
      setStore([makeContact({ id: 'c42', full_name: 'Кликабельный' })])
      render(<MainPage />)
      fireEvent.click(screen.getByText('Кликабельный').closest('ul')!)
      expect(mockPush).toHaveBeenCalledWith('/contacts/c42')
    })
  })

  describe('selection and batch delete', () => {
    it('delete button is not visible initially', () => {
      setStore([makeContact()])
      render(<MainPage />)
      expect(screen.queryByText('Удалить')).not.toBeInTheDocument()
    })

    it('delete button appears after selecting a contact', () => {
      setStore([makeContact({ id: 'c1' })])
      render(<MainPage />)
      fireEvent.click(screen.getByRole('checkbox'))
      expect(screen.getByText('Удалить')).toBeInTheDocument()
    })

    it('calls deleteContacts with selected ids', async () => {
      setStore([makeContact({ id: 'c1' })])
      render(<MainPage />)
      fireEvent.click(screen.getByRole('checkbox'))
      fireEvent.click(screen.getByText('Удалить'))
      fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
      await waitFor(() => expect(mockDeleteContacts).toHaveBeenCalledWith(['c1']))
    })

    it('clears selection after delete', async () => {
      mockDeleteContacts.mockResolvedValue({ deleted: ['c1'], failed: [] })
      setStore([makeContact({ id: 'c1' })])
      render(<MainPage />)
      fireEvent.click(screen.getByRole('checkbox'))
      fireEvent.click(screen.getByText('Удалить'))
      fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
      await waitFor(() => expect(screen.queryByText('Удалить')).not.toBeInTheDocument())
    })
  })

  describe('modals', () => {
    it('opens CreateContactModal when "+ Добавить контакт" is clicked', () => {
      render(<MainPage />)
      fireEvent.click(screen.getByText('+ Добавить контакт'))
      expect(screen.getByTestId('create-modal')).toBeInTheDocument()
    })

    it('closes CreateContactModal when onClose is triggered from "+ Добавить контакт"', () => {
      render(<MainPage />)
      fireEvent.click(screen.getByText('+ Добавить контакт'))
      fireEvent.click(screen.getByText('close-create'))
      expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument()
    })

    it('opens CreateContactModal when mic button is clicked', () => {
      render(<MainPage />)
      fireEvent.click(screen.getByTitle('Создать контакт голосом'))
      expect(screen.getByTestId('create-modal')).toBeInTheDocument()
    })

    it('closes CreateContactModal when onClose is triggered from mic button', () => {
      render(<MainPage />)
      fireEvent.click(screen.getByTitle('Создать контакт голосом'))
      fireEvent.click(screen.getByText('close-create'))
      expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument()
    })
  })

  describe('draft', () => {
    it('shows draft button when voice_contact_draft is in sessionStorage', () => {
      sessionStorage.setItem('voice_contact_draft', JSON.stringify({ full_name: 'Черновик' }))
      render(<MainPage />)
      expect(screen.getByText('Черновик')).toBeInTheDocument()
    })

    it('does not show draft button when sessionStorage is empty', () => {
      render(<MainPage />)
      expect(screen.queryByText('Черновик')).not.toBeInTheDocument()
    })
  })
})
