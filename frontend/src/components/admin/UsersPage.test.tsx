import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UsersPage from './UsersPage'
import { makeUser } from '@/shared/tests/factories'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}))

vi.mock('@/shared/store', () => ({
  useUserStore: vi.fn(),
}))

vi.mock('@/shared/api', async () => ({
  AdminService: (await import('../../shared/tests/__mocks__/admin.service')).default,
}))

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, showAlert: vi.fn() }
})

import { useUserStore } from '@/shared/store'
import { AdminService } from '@/shared/api'
import { showAlert } from '@/shared/utils'

const setStoreUser = (role: 'admin' | 'user' = 'admin', id = 'self-id') => {
  vi.mocked(useUserStore).mockImplementation((sel: any) => sel({ id, role }))
}

beforeEach(() => {
  vi.clearAllMocks()
  setStoreUser()
  mockReplace.mockClear()
  vi.mocked(AdminService.getUsers).mockResolvedValue({ data: [] } as never)
  vi.mocked(AdminService.createUser).mockResolvedValue({ data: makeUser() } as never)
  vi.mocked(AdminService.deleteUser).mockResolvedValue(undefined as never)
})

describe('UsersPage', () => {
  describe('access control', () => {
    it('renders nothing for non-admin', () => {
      setStoreUser('user')
      const { container } = render(<UsersPage />)
      expect(container.firstChild).toBeNull()
    })

    it('redirects non-admin to /main', async () => {
      setStoreUser('user')
      render(<UsersPage />)
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/main'))
    })

    it('renders the page title for admin', async () => {
      render(<UsersPage />)
      await waitFor(() => expect(screen.getByText('Пользователи')).toBeInTheDocument())
    })
  })

  describe('users list', () => {
    it('fetches users on mount', async () => {
      render(<UsersPage />)
      await waitFor(() => expect(AdminService.getUsers).toHaveBeenCalled())
    })

    it('shows empty state when no users', async () => {
      render(<UsersPage />)
      await waitFor(() => expect(screen.getByText('Пользователей пока нет')).toBeInTheDocument())
    })

    it('renders user name and login in table', async () => {
      vi.mocked(AdminService.getUsers).mockResolvedValue({
        data: [makeUser({ name: 'Алексей', login: 'alex@test.com' })],
      } as never)
      render(<UsersPage />)
      await waitFor(() => expect(screen.getByText('Алексей')).toBeInTheDocument())
      expect(screen.getByText('alex@test.com')).toBeInTheDocument()
    })

    it('shows "Администратор" badge for admin users', async () => {
      vi.mocked(AdminService.getUsers).mockResolvedValue({
        data: [makeUser({ role: 'admin' })],
      } as never)
      render(<UsersPage />)
      await waitFor(() => expect(screen.getByText('Администратор')).toBeInTheDocument())
    })
  })

  describe('delete user', () => {
    it('delete button is disabled for the current user', async () => {
      vi.mocked(AdminService.getUsers).mockResolvedValue({
        data: [makeUser({ id: 'self-id', name: 'Я' })],
      } as never)
      render(<UsersPage />)
      await waitFor(() => screen.getByText('Я'))
      expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled()
    })

    it('delete button is enabled for other users', async () => {
      vi.mocked(AdminService.getUsers).mockResolvedValue({
        data: [makeUser({ id: 'other-id', name: 'Другой' })],
      } as never)
      render(<UsersPage />)
      await waitFor(() => screen.getByText('Другой'))
      expect(screen.getByRole('button', { name: 'Удалить' })).not.toBeDisabled()
    })

    it('removes the user from the list after successful delete', async () => {
      vi.mocked(AdminService.getUsers).mockResolvedValue({
        data: [makeUser({ id: 'u99', name: 'Удаляемый' })],
      } as never)
      render(<UsersPage />)
      await waitFor(() => screen.getByText('Удаляемый'))
      fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
      await waitFor(() => screen.getByText('Удалить пользователя?'))
      const confirmBtn = screen.getAllByRole('button', { name: 'Удалить' })[1]
      fireEvent.click(confirmBtn)
      await waitFor(() => expect(screen.queryByText('Удаляемый')).not.toBeInTheDocument())
    })

    it('calls AdminService.deleteUser with the correct id', async () => {
      vi.mocked(AdminService.getUsers).mockResolvedValue({
        data: [makeUser({ id: 'del-id' })],
      } as never)
      render(<UsersPage />)
      await waitFor(() => screen.getByRole('button', { name: 'Удалить' }))
      fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
      await waitFor(() => screen.getByText('Удалить пользователя?'))
      const confirmBtn = screen.getAllByRole('button', { name: 'Удалить' })[1]
      fireEvent.click(confirmBtn)
      await waitFor(() => expect(AdminService.deleteUser).toHaveBeenCalledWith('del-id'))
    })
  })

  describe('create user modal', () => {
    const openModal = async () => {
      render(<UsersPage />)
      await waitFor(() => screen.getByText('+ Зарегистрировать'))
      fireEvent.click(screen.getByText('+ Зарегистрировать'))
    }

    it('opens modal when "+ Зарегистрировать" is clicked', async () => {
      await openModal()
      expect(screen.getByText('Новый пользователь')).toBeInTheDocument()
    })

    it('"Отмена" closes the modal', async () => {
      await openModal()
      fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
      await waitFor(() => expect(screen.queryByText('Новый пользователь')).not.toBeInTheDocument())
    })

    it('"Создать" is disabled when required fields are empty', async () => {
      await openModal()
      expect(screen.getByRole('button', { name: 'Создать' })).toBeDisabled()
    })

    it('"Создать" is enabled when all required fields are filled', async () => {
      await openModal()
      fireEvent.change(screen.getByPlaceholderText('Иван Иванов'),      { target: { value: 'Пётр' } })
      fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'petr@test.com' } })
      fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'secret' } })
      expect(screen.getByRole('button', { name: 'Создать' })).not.toBeDisabled()
    })

    it('calls createUser and adds the new user to the table', async () => {
      const newUser = makeUser({ id: 'new-id', name: 'Новый Петр', login: 'petr@test.com' })
      vi.mocked(AdminService.createUser).mockResolvedValue({ data: newUser } as never)

      await openModal()
      fireEvent.change(screen.getByPlaceholderText('Иван Иванов'),      { target: { value: 'Новый Петр' } })
      fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'petr@test.com' } })
      fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'secret' } })
      fireEvent.click(screen.getByRole('button', { name: 'Создать' }))

      await waitFor(() => {
        expect(screen.getByText('Новый Петр')).toBeInTheDocument()
        expect(screen.queryByText('Новый пользователь')).not.toBeInTheDocument()
      })
    })

    it('shows alert when createUser fails', async () => {
      vi.mocked(AdminService.createUser).mockRejectedValueOnce(new Error('Логин занят'))
      await openModal()
      fireEvent.change(screen.getByPlaceholderText('Иван Иванов'),        { target: { value: 'Пётр' } })
      fireEvent.change(screen.getByPlaceholderText('user@example.com'),   { target: { value: 'petr@test.com' } })
      fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'secret' } })
      fireEvent.click(screen.getByRole('button', { name: 'Создать' }))
      await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
        { text: ['Логин занят'], btnText: 'Закрыть' },
        5000,
      ))
    })
  })
})
