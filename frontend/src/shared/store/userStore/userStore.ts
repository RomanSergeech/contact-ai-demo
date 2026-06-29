import { create } from 'zustand'
import { tryCatch, showAlert } from '../../utils'
import { SettingsService } from '../../api'

import type { TUser } from '../../types/user.types'


interface TState extends TUser {}

interface TStore extends TState {
  saveName: (name: string) => Promise<void>
  saveAiPrompt: (prompt: string) => Promise<void>
  disconnectVk: () => Promise<void>
  disconnectTelegram: () => Promise<void>
  setTelegramConnected: () => void
  setVkConnected: () => void
  setVkDisconnected: () => void
}

const onError = (msg: string) => showAlert({ text: [msg], btnText: 'Закрыть' }, 5000)

const initialState: TState = {
  id: '',
  login: '',
  name: '',
  role: 'user',
  image: null,
  ai_system_prompt: null,
  vk_connected: false,
  telegram_connected: false,
}

export const useUserStore = create<TStore>((set) => ({
  ...initialState,

  saveName: (name) => tryCatch({
    callback: async () => {
      const { data: user } = await SettingsService.saveName(name)
      set({ name: user.name })
    },
  }),

  saveAiPrompt: (prompt) => tryCatch({
    callback: async () => {
      const { data: user } = await SettingsService.saveAiPrompt(prompt)
      set({ ai_system_prompt: user.ai_system_prompt })
    },
  }),

  disconnectVk: () => tryCatch({
    callback: async () => {
      const { data: user } = await SettingsService.disconnectVk()
      set({ vk_connected: user.vk_connected })
    },
    onError,
  }),

  disconnectTelegram: () => tryCatch({
    callback: async () => {
      const { data: user } = await SettingsService.disconnectTelegram()
      set({ telegram_connected: user.telegram_connected })
    },
    onError,
  }),

  setTelegramConnected: () => set({ telegram_connected: true }),

  setVkConnected: () => set({ vk_connected: true }),

  setVkDisconnected: () => set({ vk_connected: false }),
}))
