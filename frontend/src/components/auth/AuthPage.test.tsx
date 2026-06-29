import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthPage } from './AuthPage'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

const { mockLogin } = vi.hoisted(() => ({
  mockLogin: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/shared/store', () => ({
  useAuthStore: Object.assign(vi.fn(), {
    getState: () => ({ login: mockLogin }),
  }),
  useAlertStore: Object.assign(vi.fn(), {
    getState: () => ({ show: vi.fn(), hide: vi.fn() }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockLogin.mockResolvedValue(undefined)
  mockPush.mockClear()
})

describe('AuthPage', () => {
  describe('rendering', () => {
    it('renders login input', () => {
      render(<AuthPage />)
      expect(screen.getByPlaceholderText('Введите логин')).toBeInTheDocument()
    })

    it('renders password input', () => {
      render(<AuthPage />)
      expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<AuthPage />)
      expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
    })

    it('submit button is not disabled initially', () => {
      render(<AuthPage />)
      expect(screen.getByRole('button', { name: 'Войти' })).not.toBeDisabled()
    })

    it('renders terms link', () => {
      render(<AuthPage />)
      expect(screen.getByText('пользовательское соглашение')).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    const fillAndSubmit = async (login = 'user@test.com', password = 'secret') => {
      render(<AuthPage />)
      fireEvent.change(screen.getByPlaceholderText('Введите логин'),    { target: { value: login,    name: 'login'    } })
      fireEvent.change(screen.getByPlaceholderText('Введите пароль'),   { target: { value: password, name: 'password' } })
      fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form')!)
    }

    it('calls login on form submit', async () => {
      await fillAndSubmit()
      await waitFor(() => expect(mockLogin).toHaveBeenCalled())
    })

    it('redirects to /main after successful login', async () => {
      await fillAndSubmit()
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/main'))
    })

    it('shows "Вход..." while submitting', async () => {
      mockLogin.mockImplementation(() => new Promise(() => {}))
      render(<AuthPage />)
      fireEvent.change(screen.getByPlaceholderText('Введите логин'),  { target: { value: 'a', name: 'login'    } })
      fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'b', name: 'password' } })
      fireEvent.submit(screen.getByRole('button', { name: 'Войти' }).closest('form')!)
      await waitFor(() => expect(screen.getByRole('button', { name: 'Вход...' })).toBeDisabled())
    })

    it('does not redirect when login throws', async () => {
      mockLogin.mockRejectedValue(new Error('401'))
      await fillAndSubmit()
      await waitFor(() => expect(mockLogin).toHaveBeenCalled())
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('password toggle', () => {
    it('password input starts as type="password"', () => {
      render(<AuthPage />)
      expect(screen.getByPlaceholderText('Введите пароль')).toHaveAttribute('type', 'password')
    })

    it('clicking eye icon toggles input to type="text"', () => {
      render(<AuthPage />)
      const toggle = document.querySelector('.show_hide_password')!
      fireEvent.click(toggle)
      expect(screen.getByPlaceholderText('Введите пароль')).toHaveAttribute('type', 'text')
    })

    it('clicking eye icon again toggles back to type="password"', () => {
      render(<AuthPage />)
      fireEvent.click(document.querySelector('.show_hide_password')!)
      fireEvent.click(document.querySelector('.show_hide_password')!)
      expect(screen.getByPlaceholderText('Введите пароль')).toHaveAttribute('type', 'password')
    })
  })
})
