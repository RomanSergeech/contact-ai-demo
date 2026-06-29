import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUserStore } from './userStore'

vi.mock('@/shared/api', () => ({
  SettingsService: {
    saveName: vi.fn(), saveAiPrompt: vi.fn(),
    disconnectVk: vi.fn(), disconnectTelegram: vi.fn(),
  },
}))

import { SettingsService } from '@/shared/api'

const makeUser = (overrides = {}) => ({
  id: 'u1', login: 'test@example.com', name: 'Ivan',
  role: 'user' as const, image: null, ai_system_prompt: null,
  vk_connected: false, telegram_connected: false,
  ...overrides,
})

beforeEach(() => {
  useUserStore.setState({
    id: '', login: '', name: '', role: 'user', image: null,
    ai_system_prompt: null, vk_connected: false, telegram_connected: false,
  })
  vi.clearAllMocks()
})

describe('user.store', () => {
  describe('saveName', () => {
    it('updates name in the store after successful save', async () => {
      const user = makeUser({ name: 'New Name' })
      vi.mocked(SettingsService.saveName).mockResolvedValue({ data: user } as never)

      await useUserStore.getState().saveName('New Name')

      expect(useUserStore.getState().name).toBe('New Name')
    })

    it('calls the API with the provided name', async () => {
      vi.mocked(SettingsService.saveName).mockResolvedValue({ data: makeUser() } as never)

      await useUserStore.getState().saveName('Alex')

      expect(SettingsService.saveName).toHaveBeenCalledWith('Alex')
    })

    it('re-throws on API failure', async () => {
      vi.mocked(SettingsService.saveName).mockRejectedValue(new Error('fail'))

      await expect(useUserStore.getState().saveName('X')).rejects.toThrow()
    })
  })

  describe('saveAiPrompt', () => {
    it('updates ai_system_prompt in the store', async () => {
      const user = makeUser({ ai_system_prompt: 'Be concise' })
      vi.mocked(SettingsService.saveAiPrompt).mockResolvedValue({ data: user } as never)

      await useUserStore.getState().saveAiPrompt('Be concise')

      expect(useUserStore.getState().ai_system_prompt).toBe('Be concise')
    })

    it('calls the API with the provided prompt', async () => {
      vi.mocked(SettingsService.saveAiPrompt).mockResolvedValue({ data: makeUser() } as never)

      await useUserStore.getState().saveAiPrompt('my prompt')

      expect(SettingsService.saveAiPrompt).toHaveBeenCalledWith('my prompt')
    })
  })

  describe('disconnectVk', () => {
    it('обновляет vk_connected в сторе', async () => {
      useUserStore.setState({ vk_connected: true })
      vi.mocked(SettingsService.disconnectVk).mockResolvedValue({ data: makeUser({ vk_connected: false }) } as never)

      await useUserStore.getState().disconnectVk()

      expect(useUserStore.getState().vk_connected).toBe(false)
    })

    it('пробрасывает ошибку при сбое', async () => {
      vi.mocked(SettingsService.disconnectVk).mockRejectedValue(new Error('fail'))
      await expect(useUserStore.getState().disconnectVk()).rejects.toThrow()
    })
  })

  describe('disconnectTelegram', () => {
    it('обновляет telegram_connected в сторе', async () => {
      useUserStore.setState({ telegram_connected: true })
      vi.mocked(SettingsService.disconnectTelegram).mockResolvedValue({ data: makeUser({ telegram_connected: false }) } as never)

      await useUserStore.getState().disconnectTelegram()

      expect(useUserStore.getState().telegram_connected).toBe(false)
    })
  })

  describe('setTelegramConnected / setVkConnected / setVkDisconnected', () => {
    it('setTelegramConnected устанавливает telegram_connected в true', () => {
      useUserStore.getState().setTelegramConnected()
      expect(useUserStore.getState().telegram_connected).toBe(true)
    })

    it('setVkConnected устанавливает vk_connected в true', () => {
      useUserStore.getState().setVkConnected()
      expect(useUserStore.getState().vk_connected).toBe(true)
    })

    it('setVkDisconnected устанавливает vk_connected в false', () => {
      useUserStore.setState({ vk_connected: true })
      useUserStore.getState().setVkDisconnected()
      expect(useUserStore.getState().vk_connected).toBe(false)
    })
  })
})
