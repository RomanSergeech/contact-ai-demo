import { create } from 'zustand'
import { AuthService, SettingsService, ContactsService, TasksService } from '../../api'
import { tryCatch } from '../../utils'
import { useUserStore } from '../userStore/userStore'
import { useContactsStore } from '../contactsStore/contactsStore'
import { useTasksStore } from '../tasksStore/tasksStore'

import type { TLoginRequest } from '../../types/api.types'


interface TState {
  isAuth: boolean
  loading: boolean
}

interface TStore extends TState {
  checkAuth: () => Promise<void>
  login: (reqData: TLoginRequest) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const initialState: TState = {
  isAuth: false,
  loading: true,
}

// Очистка клиентского хранилища при выходе/удалении аккаунта.
// localStorage содержит PII (черновики карточек, данные обогащения), которые
// не должны переживать сессию на общем устройстве — чистим их вместе с sessionStorage.
const clearClientStorage = () => {
  sessionStorage.clear()

  // Удаляем чувствительные ключи: результат VK OAuth,
  // а также per-contact ключи enriched_* и pendingAction_*
  // (черновик контакта теперь в sessionStorage — очищен выше)
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (
      key === 'vk-oauth-result' ||
      key.startsWith('enriched_') ||
      key.startsWith('pendingAction_')
    ) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
}

const loadInitialData = async () => {
  const [contacts, tasks] = await Promise.all([
    ContactsService.getAll(),
    TasksService.getAll(),
  ])
  useContactsStore.setState({ contacts: contacts.data ?? [] })
  useTasksStore.setState({ tasks: tasks.data ?? [] })
}

export const useAuthStore = create<TStore>((set) => ({
  ...initialState,

  checkAuth: () => tryCatch({
    callback: async () => {
      set({ loading: true })

      const { data } = await AuthService.checkAuth()

      useUserStore.setState(data.user)
      await loadInitialData()

      set({ isAuth: true })
    },
    onError: () => set({ isAuth: false }),
    onFinally: () => set({ loading: false }),
  }),

  login: (reqData) => tryCatch({
    callback: async () => {
      const { data } = await AuthService.login(reqData)

      useUserStore.setState(data.user)
      await loadInitialData()

      set({ isAuth: true })
    },
    onFinally: () => set({ loading: false }),
  }),

  logout: () => tryCatch({
    callback: async () => {
      await AuthService.logout()
      clearClientStorage()
      set({ ...initialState, loading: false })
    },
  }),

  deleteAccount: () => tryCatch({
    callback: async () => {
      await SettingsService.deleteAccount()
      clearClientStorage()
      set({ ...initialState, loading: false })
    },
  }),
}))
