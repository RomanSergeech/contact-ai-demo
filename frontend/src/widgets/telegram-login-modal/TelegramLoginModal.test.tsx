import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TelegramLoginModal } from './TelegramLoginModal'

vi.mock('@/shared/api', () => ({
  SettingsService: {
    telegramQrStart:    vi.fn().mockRejectedValue(new Error('нет QR')),
    telegramQrPoll:     vi.fn(),
    telegramLoginStart: vi.fn().mockResolvedValue({ data: { step: 'code' } }),
    telegramLoginCode:  vi.fn().mockResolvedValue({ data: { step: 'done' } }),
    telegramLoginPassword: vi.fn().mockResolvedValue({ data: {} }),
    telegramLoginCancel:   vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/shared/store', () => ({
  useUserStore: vi.fn(),
}))

import { SettingsService } from '@/shared/api'
import { useUserStore } from '@/shared/store'

const mockSetTelegramConnected = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useUserStore).mockImplementation((sel: any) =>
    sel({ setTelegramConnected: mockSetTelegramConnected })
  )
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })
})

afterEach(() => { vi.unstubAllGlobals() })

const renderModal = (props: Partial<{ onClose: () => void; onConnected: () => void }> = {}) =>
  render(
    <TelegramLoginModal
      active={true}
      onClose={props.onClose ?? vi.fn()}
      onConnected={props.onConnected ?? vi.fn()}
    />
  )

describe('TelegramLoginModal', () => {
  describe('шаг phone', () => {
    it('показывает поле ввода телефона по умолчанию', () => {
      renderModal()
      expect(screen.getByPlaceholderText('+7 (___) ___-__-__')).toBeInTheDocument()
    })

    it('"Получить код" заблокирована при пустом телефоне', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Получить код' })).toBeDisabled()
    })

    it('"Получить код" активна после ввода телефона', () => {
      renderModal()
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      expect(screen.getByRole('button', { name: 'Получить код' })).not.toBeDisabled()
    })

    it('клик "Получить код" вызывает telegramLoginStart', async () => {
      renderModal()
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
      await waitFor(() => expect(SettingsService.telegramLoginStart).toHaveBeenCalled())
    })

    it('переходит к шагу code после успешного запроса', async () => {
      renderModal()
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
      await waitFor(() => expect(screen.getByPlaceholderText('Код подтверждения')).toBeInTheDocument())
    })

    it('"Отмена" на шаге phone вызывает onClose без вызова cancel API', async () => {
      const onClose = vi.fn()
      renderModal({ onClose })
      fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
      expect(onClose).toHaveBeenCalled()
      expect(SettingsService.telegramLoginCancel).not.toHaveBeenCalled()
    })
  })

  describe('шаг code', () => {
    const goToCodeStep = async () => {
      renderModal()
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
      await waitFor(() => screen.getByPlaceholderText('Код подтверждения'))
    }

    it('"Подтвердить" заблокирована при пустом коде', async () => {
      await goToCodeStep()
      expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeDisabled()
    })

    it('вызывает telegramLoginCode с введённым кодом', async () => {
      await goToCodeStep()
      fireEvent.change(screen.getByPlaceholderText('Код подтверждения'), { target: { value: '12345' } })
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
      await waitFor(() => expect(SettingsService.telegramLoginCode).toHaveBeenCalledWith('12345'))
    })

    it('вызывает setTelegramConnected и onConnected при step=done', async () => {
      const onConnected = vi.fn()
      render(<TelegramLoginModal active={true} onClose={vi.fn()} onConnected={onConnected} />)
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
      await waitFor(() => screen.getByPlaceholderText('Код подтверждения'))
      fireEvent.change(screen.getByPlaceholderText('Код подтверждения'), { target: { value: '12345' } })
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
      await waitFor(() => {
        expect(mockSetTelegramConnected).toHaveBeenCalled()
        expect(onConnected).toHaveBeenCalled()
      })
    })

    it('переходит к шагу password при ответе step=password', async () => {
      vi.mocked(SettingsService.telegramLoginCode).mockResolvedValueOnce({ data: { step: 'password' } } as any)
      await goToCodeStep()
      fireEvent.change(screen.getByPlaceholderText('Код подтверждения'), { target: { value: '12345' } })
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
      await waitFor(() => expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument())
    })

    it('"Отмена" на шаге code вызывает telegramLoginCancel и onClose', async () => {
      const onClose = vi.fn()
      render(<TelegramLoginModal active={true} onClose={onClose} onConnected={vi.fn()} />)
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
      await waitFor(() => screen.getByPlaceholderText('Код подтверждения'))
      fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
      await waitFor(() => {
        expect(SettingsService.telegramLoginCancel).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe('шаг password', () => {
    const goToPasswordStep = async () => {
      vi.mocked(SettingsService.telegramLoginCode).mockResolvedValueOnce({ data: { step: 'password' } } as any)
      renderModal()
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
      await waitFor(() => screen.getByPlaceholderText('Код подтверждения'))
      fireEvent.change(screen.getByPlaceholderText('Код подтверждения'), { target: { value: '12345' } })
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
      await waitFor(() => screen.getByPlaceholderText('Пароль'))
    }

    it('"Подтвердить" заблокирована при пустом пароле', async () => {
      await goToPasswordStep()
      expect(screen.getByRole('button', { name: 'Подтвердить' })).toBeDisabled()
    })

    it('вызывает telegramLoginPassword с введённым паролем', async () => {
      await goToPasswordStep()
      fireEvent.change(screen.getByPlaceholderText('Пароль'), { target: { value: 'мой_пароль' } })
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
      await waitFor(() => expect(SettingsService.telegramLoginPassword).toHaveBeenCalledWith('мой_пароль'))
    })

    it('вызывает setTelegramConnected и onConnected после успешного входа', async () => {
      const onConnected = vi.fn()
      vi.mocked(SettingsService.telegramLoginCode).mockResolvedValueOnce({ data: { step: 'password' } } as any)
      render(<TelegramLoginModal active={true} onClose={vi.fn()} onConnected={onConnected} />)
      fireEvent.change(screen.getByPlaceholderText('+7 (___) ___-__-__'), { target: { value: '79001234567' } })
      fireEvent.click(screen.getByRole('button', { name: 'Получить код' }))
      await waitFor(() => screen.getByPlaceholderText('Код подтверждения'))
      fireEvent.change(screen.getByPlaceholderText('Код подтверждения'), { target: { value: '12345' } })
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
      await waitFor(() => screen.getByPlaceholderText('Пароль'))
      fireEvent.change(screen.getByPlaceholderText('Пароль'), { target: { value: 'мой_пароль' } })
      fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }))
      await waitFor(() => {
        expect(mockSetTelegramConnected).toHaveBeenCalled()
        expect(onConnected).toHaveBeenCalled()
      })
    })
  })
})
