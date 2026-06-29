import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'
import { useUserStore } from '../userStore/userStore'
import { useContactsStore } from '../contactsStore/contactsStore'
import { useTasksStore } from '../tasksStore/tasksStore'

vi.mock('@/shared/api', () => ({
  AuthService: { checkAuth: vi.fn(), login: vi.fn(), logout: vi.fn() },
  ContactsService: { getAll: vi.fn() },
  TasksService: { getAll: vi.fn() },
  SettingsService: { saveName: vi.fn(), saveAiPrompt: vi.fn(), deleteAccount: vi.fn() },
}))

import { AuthService, ContactsService, TasksService, SettingsService } from '@/shared/api'

const mockUser = {
  id: 'u1', login: 'test@example.com', name: 'Ivan',
  role: 'user' as const, image: null, ai_system_prompt: null,
}

beforeEach(() => {
  useAuthStore.setState({ isAuth: false, loading: true })
  useUserStore.setState({ id: '', login: '', name: '', role: 'user', image: null, ai_system_prompt: null })
  useContactsStore.setState({ contacts: [], loading: false })
  useTasksStore.setState({ tasks: [], openedTaskId: null, loading: false })
  vi.clearAllMocks()

  vi.mocked(ContactsService.getAll).mockResolvedValue({ data: [] } as never)
  vi.mocked(TasksService.getAll).mockResolvedValue({ data: [] } as never)
})

describe('auth.store', () => {
  describe('login', () => {
    it('sets isAuth to true', async () => {
      vi.mocked(AuthService.login).mockResolvedValue({
        data: { access_token: 'tok', user: mockUser },
      } as never)

      await useAuthStore.getState().login({ login: 'a', password: 'b' })

      expect(useAuthStore.getState().isAuth).toBe(true)
    })

    it('hydrates the user store', async () => {
      vi.mocked(AuthService.login).mockResolvedValue({
        data: { access_token: 'tok', user: mockUser },
      } as never)

      await useAuthStore.getState().login({ login: 'a', password: 'b' })

      const user = useUserStore.getState()
      expect(user.id).toBe('u1')
      expect(user.name).toBe('Ivan')
    })

    it('hydrates contacts and tasks stores', async () => {
      const contact = { id: 'c1', full_name: 'Test' }
      const task = { id: 't1', title: 'Todo' }
      vi.mocked(AuthService.login).mockResolvedValue({
        data: { access_token: 'tok', user: mockUser },
      } as never)
      vi.mocked(ContactsService.getAll).mockResolvedValue({ data: [contact] } as never)
      vi.mocked(TasksService.getAll).mockResolvedValue({ data: [task] } as never)

      await useAuthStore.getState().login({ login: 'a', password: 'b' })

      expect(useContactsStore.getState().contacts).toHaveLength(1)
      expect(useTasksStore.getState().tasks).toHaveLength(1)
    })

    it('sets loading to false after completion', async () => {
      vi.mocked(AuthService.login).mockResolvedValue({
        data: { access_token: 'tok', user: mockUser },
      } as never)

      await useAuthStore.getState().login({ login: 'a', password: 'b' })

      expect(useAuthStore.getState().loading).toBe(false)
    })

    it('does not set isAuth when AuthService.login fails', async () => {
      vi.mocked(AuthService.login).mockRejectedValue(new Error('401'))

      await expect(useAuthStore.getState().login({ login: 'a', password: 'b' })).rejects.toThrow()

      expect(useAuthStore.getState().isAuth).toBe(false)
    })

    it('resets loading to false when AuthService.login fails', async () => {
      vi.mocked(AuthService.login).mockRejectedValue(new Error('401'))

      await expect(useAuthStore.getState().login({ login: 'a', password: 'b' })).rejects.toThrow()

      expect(useAuthStore.getState().loading).toBe(false)
    })

    it('does not set isAuth when contacts load fails after login', async () => {
      vi.mocked(AuthService.login).mockResolvedValue({
        data: { access_token: 'tok', user: mockUser },
      } as never)
      vi.mocked(ContactsService.getAll).mockRejectedValue(new Error('500'))

      await expect(useAuthStore.getState().login({ login: 'a', password: 'b' })).rejects.toThrow()

      expect(useAuthStore.getState().isAuth).toBe(false)
    })
  })

  describe('logout', () => {
    it('sets isAuth to false', async () => {
      useAuthStore.setState({ isAuth: true })
      vi.mocked(AuthService.logout).mockResolvedValue(undefined as never)

      await useAuthStore.getState().logout()

      expect(useAuthStore.getState().isAuth).toBe(false)
    })

    it('does not clear isAuth when API fails', async () => {
      useAuthStore.setState({ isAuth: true })
      vi.mocked(AuthService.logout).mockRejectedValue(new Error('500'))

      await expect(useAuthStore.getState().logout()).rejects.toThrow()

      expect(useAuthStore.getState().isAuth).toBe(true)
    })
  })

  describe('checkAuth', () => {
    it('sets isAuth on success', async () => {
      vi.mocked(AuthService.checkAuth).mockResolvedValue({
        data: { access_token: 'refreshed', user: mockUser },
      } as never)

      await useAuthStore.getState().checkAuth()

      expect(useAuthStore.getState().isAuth).toBe(true)
    })

    it('sets loading to false even when checkAuth fails', async () => {
      vi.mocked(AuthService.checkAuth).mockRejectedValue(new Error('401'))

      await useAuthStore.getState().checkAuth().catch(() => {})

      expect(useAuthStore.getState().loading).toBe(false)
    })

    it('does not set isAuth when contacts load fails after refresh', async () => {
      vi.mocked(AuthService.checkAuth).mockResolvedValue({
        data: { access_token: 'refreshed', user: mockUser },
      } as never)
      vi.mocked(ContactsService.getAll).mockRejectedValue(new Error('500'))

      await useAuthStore.getState().checkAuth().catch(() => {})

      expect(useAuthStore.getState().isAuth).toBe(false)
    })

    it('does not set isAuth when tasks load fails after refresh', async () => {
      vi.mocked(AuthService.checkAuth).mockResolvedValue({
        data: { access_token: 'refreshed', user: mockUser },
      } as never)
      vi.mocked(TasksService.getAll).mockRejectedValue(new Error('500'))

      await useAuthStore.getState().checkAuth().catch(() => {})

      expect(useAuthStore.getState().isAuth).toBe(false)
    })
  })

  describe('deleteAccount', () => {
    it('sets isAuth to false', async () => {
      useAuthStore.setState({ isAuth: true })
      vi.mocked(SettingsService.deleteAccount).mockResolvedValue(undefined as never)

      await useAuthStore.getState().deleteAccount()

      expect(useAuthStore.getState().isAuth).toBe(false)
    })

    it('does not clear isAuth when API fails', async () => {
      useAuthStore.setState({ isAuth: true })
      vi.mocked(SettingsService.deleteAccount).mockRejectedValue(new Error('500'))

      await expect(useAuthStore.getState().deleteAccount()).rejects.toThrow()

      expect(useAuthStore.getState().isAuth).toBe(true)
    })
  })
})
