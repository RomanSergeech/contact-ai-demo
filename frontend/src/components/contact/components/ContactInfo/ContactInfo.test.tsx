import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContactInfo } from './ContactInfo'
import { makeContact } from '@/shared/tests/factories'
import type { TContact, TContactInfo } from '@/shared/types/contact.types'

// мутабельное состояние стора пользователя — доступно и как хук, и как getState()
const { userState, nav } = vi.hoisted(() => ({
  userState: {
    vk_connected:       false,
    telegram_connected: false,
    disconnectVk:       vi.fn(),
    setVkConnected:     vi.fn(),
  },
  nav: {
    params:  new URLSearchParams(),
    replace: vi.fn(),
    push:    vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter:       () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => nav.params,
}))

vi.mock('@/shared/store', () => {
  const useUserStore: any = vi.fn((sel?: any) => sel ? sel(userState) : userState)
  useUserStore.getState = () => userState
  return { useUserStore }
})

vi.mock('@/shared/api', () => ({
  AiService: {
    scrapeVkProfile:       vi.fn(),
    scrapeTelegramProfile: vi.fn(),
    enrichTelegramGroup:   vi.fn(),
    analyzeActivity:       vi.fn(),
    scrapeWebsite:         vi.fn(),
    enrichFromSocial:      vi.fn(),
  },
}))

// модалки-заглушки: рендерятся только когда active, кнопка имитирует onConnected
vi.mock('@/widgets', () => ({
  TelegramLoginModal: ({ active, onConnected }: any) =>
    active ? <button data-testid="tg-modal" onClick={onConnected}>tg</button> : null,
  VkOAuthModal: ({ active }: any) =>
    active ? <div data-testid="vk-modal" /> : null,
}))

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, showAlert: vi.fn() }
})

import { AiService } from '@/shared/api'
import { showAlert } from '@/shared/utils'

const makeInfo = (overrides: Partial<TContactInfo> = {}): TContactInfo => ({
  phone:            '',
  email:            '',
  telegram_profile: 'https://t.me/user',
  telegram_group:   'https://t.me/group',
  whatsapp:         '',
  instagram:        '',
  vk_profile:       'https://vk.com/id1',
  vk_group:         'https://vk.com/group',
  personal_site:    'https://example.com',
  company_site:     'https://company.com',
  ...overrides,
})

const okResponse = { data: { contact: makeContact(), logs: [] } }

const renderInfo = (contactOverrides: Partial<TContact> = {}) => {
  const props = {
    contact:           makeContact({ contact_info: makeInfo(), ...contactOverrides }),
    set:               vi.fn(),
    conflicts:         [],
    resolvingKeys:     new Set<string>(),
    onResolveConflict: vi.fn(),
    onEnrichResult:    vi.fn(),
    onActivityResult:  vi.fn(),
    onScrapingChange:  vi.fn(),
    onSave:            vi.fn().mockResolvedValue(undefined),
  }
  render(<ContactInfo {...props} />)
  return props
}

// заголовки кнопок EnrichButton (у кнопки нет доступного имени — таргетим по title)
const VK_PROFILE_CONNECTED = 'Заполнить из VK-профиля и проанализировать посты за последнюю неделю'
const VK_PROFILE_DISCONNECTED = 'Подключить VK'
const PERSONAL_SITE = 'Заполнить из личного сайта'
const TG_DISCONNECTED = 'Подключить Telegram'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  userState.vk_connected = false
  userState.telegram_connected = false
  nav.params = new URLSearchParams()
})

describe('ContactInfo', () => {

  describe('порядок save перед скрапингом сайта', () => {
    it('вызывает onSave до AiService.scrapeWebsite и пробрасывает результат в onEnrichResult', async () => {
      vi.mocked(AiService.scrapeWebsite).mockResolvedValue(okResponse as never)
      const props = renderInfo()

      fireEvent.click(screen.getByTitle(PERSONAL_SITE))

      await waitFor(() => expect(AiService.scrapeWebsite).toHaveBeenCalledWith('c1', 'personal_site'))
      const saveOrder = props.onSave.mock.invocationCallOrder[0]
      const scrapeOrder = vi.mocked(AiService.scrapeWebsite).mock.invocationCallOrder[0]
      expect(saveOrder).toBeLessThan(scrapeOrder)
      await waitFor(() => expect(props.onEnrichResult).toHaveBeenCalledWith(okResponse.data))
    })

    it('показывает алерт, если сайт не дал изменений (log type no_changes)', async () => {
      vi.mocked(AiService.scrapeWebsite).mockResolvedValue({
        data: { contact: makeContact(), logs: [{ type: 'no_changes', message: 'Новых данных нет' }] },
      } as never)
      renderInfo()

      fireEvent.click(screen.getByTitle(PERSONAL_SITE))

      await waitFor(() =>
        expect(showAlert).toHaveBeenCalledWith({ text: ['Новых данных нет'], btnText: 'Закрыть' }, 5000),
      )
    })

    it('показывает алерт с текстом ошибки при провале scrapeWebsite', async () => {
      vi.mocked(AiService.scrapeWebsite).mockRejectedValue(new Error('Сайт недоступен'))
      renderInfo()

      fireEvent.click(screen.getByTitle(PERSONAL_SITE))

      await waitFor(() =>
        expect(showAlert).toHaveBeenCalledWith({ text: ['Сайт недоступен'], btnText: 'Закрыть' }, 5000),
      )
    })
  })

  describe('VK не подключён — переход к подключению', () => {
    it('сохраняет, ставит pendingAction и открывает VK-модалку, не вызывая scrapeVkProfile', async () => {
      userState.vk_connected = false
      const props = renderInfo()

      fireEvent.click(screen.getByTitle(VK_PROFILE_DISCONNECTED))

      await waitFor(() => expect(screen.getByTestId('vk-modal')).toBeInTheDocument())
      expect(props.onSave).toHaveBeenCalled()
      expect(localStorage.getItem('pendingAction_c1')).toBe('scrape-vk-profile')
      expect(AiService.scrapeVkProfile).not.toHaveBeenCalled()
    })
  })

  describe('VK подключён — успешный скрапинг', () => {
    it('вызывает scrapeVkProfile, пробрасывает результат и сохраняет флаг enriched в localStorage', async () => {
      userState.vk_connected = true
      vi.mocked(AiService.scrapeVkProfile).mockResolvedValue(okResponse as never)
      const props = renderInfo()

      fireEvent.click(screen.getByTitle(VK_PROFILE_CONNECTED))

      await waitFor(() => expect(props.onEnrichResult).toHaveBeenCalledWith(okResponse.data))
      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('enriched_c1') ?? '{}')
        expect(stored.vk_profile).toBe(true)
      })
    })
  })

  describe('ветвление по кодам ошибок VK', () => {
    it('NOT_CONNECTED → ставит pendingAction и открывает модалку без алерта', async () => {
      userState.vk_connected = true
      vi.mocked(AiService.scrapeVkProfile).mockRejectedValue(new Error('NOT_CONNECTED'))
      renderInfo()

      fireEvent.click(screen.getByTitle(VK_PROFILE_CONNECTED))

      await waitFor(() => expect(screen.getByTestId('vk-modal')).toBeInTheDocument())
      expect(localStorage.getItem('pendingAction_c1')).toBe('scrape-vk-profile')
      expect(showAlert).not.toHaveBeenCalled()
      expect(userState.disconnectVk).not.toHaveBeenCalled()
    })

    it('«Невалидный VK-токен» → отключает VK и открывает модалку', async () => {
      userState.vk_connected = true
      vi.mocked(AiService.scrapeVkProfile).mockRejectedValue(new Error('Невалидный VK-токен'))
      renderInfo()

      fireEvent.click(screen.getByTitle(VK_PROFILE_CONNECTED))

      await waitFor(() => expect(userState.disconnectVk).toHaveBeenCalled())
      expect(screen.getByTestId('vk-modal')).toBeInTheDocument()
      expect(showAlert).not.toHaveBeenCalled()
    })

    it('прочая ошибка → показывает алерт, VK не отключает', async () => {
      userState.vk_connected = true
      vi.mocked(AiService.scrapeVkProfile).mockRejectedValue(new Error('Сервис недоступен'))
      renderInfo()

      fireEvent.click(screen.getByTitle(VK_PROFILE_CONNECTED))

      await waitFor(() =>
        expect(showAlert).toHaveBeenCalledWith({ text: ['Сервис недоступен'], btnText: 'Закрыть' }, 5000),
      )
      expect(userState.disconnectVk).not.toHaveBeenCalled()
      expect(screen.queryByTestId('vk-modal')).not.toBeInTheDocument()
    })
  })

  describe('Telegram не подключён', () => {
    it('сохраняет, ставит pendingAction и открывает Telegram-модалку', async () => {
      userState.telegram_connected = false
      const props = renderInfo()

      // у профиля и канала одинаковый title «Подключить Telegram» — берём профиль (первый)
      fireEvent.click(screen.getAllByTitle(TG_DISCONNECTED)[0])

      await waitFor(() => expect(screen.getByTestId('tg-modal')).toBeInTheDocument())
      expect(props.onSave).toHaveBeenCalled()
      expect(localStorage.getItem('pendingAction_c1')).toBe('scrape-telegram-profile')
      expect(AiService.scrapeTelegramProfile).not.toHaveBeenCalled()
    })
  })

  describe('гейт isScraping → onScrapingChange', () => {
    it('сообщает true на время запроса и false после завершения', async () => {
      userState.vk_connected = true
      let resolveScrape!: (v: unknown) => void
      vi.mocked(AiService.scrapeVkProfile).mockReturnValue(
        new Promise(res => { resolveScrape = res }) as never,
      )
      const props = renderInfo()

      fireEvent.click(screen.getByTitle(VK_PROFILE_CONNECTED))

      await waitFor(() => expect(props.onScrapingChange).toHaveBeenCalledWith(true))

      resolveScrape(okResponse)

      await waitFor(() => expect(props.onScrapingChange.mock.calls.at(-1)?.[0]).toBe(false))
    })
  })

  describe('возврат из VK OAuth через searchParams', () => {
    it('status=success → запускает pendingAction, чистит URL и убирает pendingAction', async () => {
      userState.vk_connected = true
      localStorage.setItem('pendingAction_c1', 'scrape-vk-profile')
      vi.mocked(AiService.scrapeVkProfile).mockResolvedValue(okResponse as never)
      nav.params = new URLSearchParams('integration=vk&status=success')

      renderInfo()

      await waitFor(() => expect(AiService.scrapeVkProfile).toHaveBeenCalledWith('c1'))
      expect(nav.replace).toHaveBeenCalledWith('/contacts/c1')
      expect(localStorage.getItem('pendingAction_c1')).toBeNull()
    })

    it('status=error → показывает алерт и не запускает скрапинг', async () => {
      nav.params = new URLSearchParams('integration=vk&status=error')

      renderInfo()

      await waitFor(() =>
        expect(showAlert).toHaveBeenCalledWith({ text: ['Не удалось подключить VK'], btnText: 'Закрыть' }, 5000),
      )
      expect(AiService.scrapeVkProfile).not.toHaveBeenCalled()
    })
  })

})
