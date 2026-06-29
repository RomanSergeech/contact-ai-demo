import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('@/shared/store', () => ({
  useUserStore: vi.fn(),
  useAuthStore: vi.fn(),
}))

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, showAlert: vi.fn() }
})

import { useUserStore, useAuthStore } from '@/shared/store'
import { showAlert } from '@/shared/utils'

const mockSaveName = vi.fn().mockResolvedValue(undefined)
const mockSavePrompt = vi.fn().mockResolvedValue(undefined)
const mockDeleteAcct = vi.fn().mockResolvedValue(undefined)
const mockDisconnectVk = vi.fn().mockResolvedValue(undefined)
const mockDisconnectTelegram = vi.fn().mockResolvedValue(undefined)

const setStores = (overrides: { name?: string; ai_system_prompt?: string | null; vk_connected?: boolean; telegram_connected?: boolean } = {}) => {
  vi.mocked(useUserStore).mockReturnValue({
    name: overrides.name ?? 'Иван',
    ai_system_prompt: overrides.ai_system_prompt ?? 'Мой промпт',
    vk_connected: overrides.vk_connected ?? false,
    telegram_connected: overrides.telegram_connected ?? false,
    saveName: mockSaveName,
    saveAiPrompt: mockSavePrompt,
    disconnectVk: mockDisconnectVk,
    disconnectTelegram: mockDisconnectTelegram,
  } as any)
  vi.mocked(useAuthStore).mockImplementation((sel: any) => sel({ deleteAccount: mockDeleteAcct }))
}

beforeEach(() => {
  vi.clearAllMocks()
  setStores()
  mockReplace.mockClear()
})

describe('SettingsPage', () => {
  describe('profile section', () => {
    it('renders name input with current name', () => {
      render(<SettingsPage />)
      expect(screen.getByDisplayValue('Иван')).toBeInTheDocument()
    })

    it('"Сохранить" is disabled when name is empty', () => {
      setStores({ name: '' })
      render(<SettingsPage />)
      // First "Сохранить" button is for the name section
      expect(screen.getAllByRole('button', { name: 'Сохранить' })[0]).toBeDisabled()
    })

    it('"Сохранить" calls saveName with trimmed value', async () => {
      render(<SettingsPage />)
      const nameInput = screen.getByDisplayValue('Иван')
      fireEvent.change(nameInput, { target: { value: '  Пётр  ' } })
      fireEvent.click(screen.getAllByRole('button', { name: 'Сохранить' })[0])
      await waitFor(() => expect(mockSaveName).toHaveBeenCalledWith('Пётр'))
    })

    it('shows "✓ Сохранено" after successful name save', async () => {
      render(<SettingsPage />)
      fireEvent.click(screen.getAllByRole('button', { name: 'Сохранить' })[0])
      await waitFor(() => expect(screen.getAllByText('✓ Сохранено').length).toBeGreaterThan(0))
    })
  })

  describe('AI prompt section', () => {
    it('renders prompt textarea with current prompt', () => {
      render(<SettingsPage />)
      expect(screen.getByDisplayValue('Мой промпт')).toBeInTheDocument()
    })

    it('"Сохранить" calls saveAiPrompt', async () => {
      render(<SettingsPage />)
      const promptTA = screen.getByDisplayValue('Мой промпт')
      fireEvent.change(promptTA, { target: { value: 'Новый промпт' } })
      fireEvent.click(screen.getAllByRole('button', { name: 'Сохранить' })[1])
      await waitFor(() => expect(mockSavePrompt).toHaveBeenCalledWith('Новый промпт'))
    })
  })

  describe('delete account', () => {
    it('shows "Удалить аккаунт" button initially', () => {
      render(<SettingsPage />)
      expect(screen.getByRole('button', { name: 'Удалить аккаунт' })).toBeInTheDocument()
    })

    it('clicking "Удалить аккаунт" shows confirm dialog', () => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
      expect(screen.getByText('Вы уверены? Это действие нельзя отменить.')).toBeInTheDocument()
    })

    it('"Отмена" in confirm hides the dialog', () => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
      fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
      expect(screen.queryByText('Вы уверены? Это действие нельзя отменить.')).not.toBeInTheDocument()
    })

    it('"Да, удалить" calls deleteAccount', async () => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
      fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
      await waitFor(() => expect(mockDeleteAcct).toHaveBeenCalled())
    })

    it('redirects to "/" after account deletion', async () => {
      render(<SettingsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
      fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
    })

    it('shows alert when deleteAccount fails', async () => {
      mockDeleteAcct.mockRejectedValueOnce(new Error('Сервер недоступен'))
      render(<SettingsPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
      fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
      await waitFor(() => expect(showAlert).toHaveBeenCalledWith(
        { text: ['Сервер недоступен'], btnText: 'Закрыть' },
        5000,
      ))
    })
  })
})
