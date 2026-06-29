import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateContactModal, DRAFT_KEY } from './CreateContactModal'
import type { TCreateContactData } from './CreateContactModal'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

vi.mock('@/shared/store', () => ({
  useContactsStore: vi.fn(),
}))

vi.mock('@/shared/api', async () => ({
  AiService: (await import('../../../../shared/tests/__mocks__/ai.service')).default,
}))

import { useContactsStore } from '@/shared/store'
import { AiService } from '@/shared/api'

const mockCreateContact = vi.fn()

const makeDraft = (overrides: Partial<TCreateContactData> = {}): TCreateContactData => ({
  full_name: 'Иван Иванов', position: 'CTO', company: 'ООО Тест',
  direction: '', priority: 'medium', relationship_level: 'cold',
  goals: '', main_pain: '', interests: '', dream: '',
  personal_traits: '', useful_to_me: '', useful_to_them: '',
  last_contact: '', birth_date: '', important_dates: [],
  phone: '', email: '',
  telegram_profile: '', telegram_group: '',
  whatsapp: '', instagram: '',
  vk_profile: '', vk_group: '',
  personal_site: '', company_site: '',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockPush.mockClear()
  localStorage.clear()
  sessionStorage.clear()
  mockCreateContact.mockResolvedValue({ id: 'new-id' })
  vi.mocked(useContactsStore).mockImplementation((sel: any) =>
    sel({ createContact: mockCreateContact })
  )
  // Без SpeechRecognition компонент вызывает alert() и onClose() при autoRecord=true
  ;(window as any).SpeechRecognition = undefined
  ;(window as any).webkitSpeechRecognition = undefined
})

describe('CreateContactModal', () => {
  describe('autoRecord=true (без SpeechRecognition)', () => {
    it('вызывает onClose сразу, если SpeechRecognition недоступен', () => {
      const onClose = vi.fn()
      window.alert = vi.fn()
      render(<CreateContactModal onClose={onClose} autoRecord={true} />)
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('autoRecord=false (ручное заполнение)', () => {
    it('рендерит пустую форму без запуска записи', () => {
      render(<CreateContactModal onClose={vi.fn()} autoRecord={false} />)
      expect(screen.getByText('Проверьте данные')).toBeInTheDocument()
      expect(screen.queryByText('Идёт запись')).not.toBeInTheDocument()
    })
  })

  describe('с черновиком', () => {
    const renderWithDraft = (overrides: Partial<TCreateContactData> = {}) => {
      const draft = makeDraft(overrides)
      const onClose = vi.fn()
      const result = render(<CreateContactModal onClose={onClose} draft={draft} />)
      return { ...result, onClose, draft }
    }

    it('рендерит full_name из черновика', () => {
      renderWithDraft({ full_name: 'Пётр Смирнов' })
      expect(screen.getByDisplayValue('Пётр Смирнов')).toBeInTheDocument()
    })

    it('рендерит position из черновика', () => {
      renderWithDraft({ position: 'VP Engineering' })
      expect(screen.getByDisplayValue('VP Engineering')).toBeInTheDocument()
    })

    it('"Создать контакт" заблокирована, если full_name пуст', () => {
      renderWithDraft({ full_name: '' })
      expect(screen.getByRole('button', { name: 'Создать контакт' })).toBeDisabled()
    })

    it('"Создать контакт" активна, если full_name заполнен', () => {
      renderWithDraft()
      expect(screen.getByRole('button', { name: 'Создать контакт' })).not.toBeDisabled()
    })

    it('вызывает createContact при клике "Создать контакт"', async () => {
      renderWithDraft()
      fireEvent.click(screen.getByRole('button', { name: 'Создать контакт' }))
      await waitFor(() => expect(mockCreateContact).toHaveBeenCalled())
    })

    it('переходит на страницу контакта после создания', async () => {
      renderWithDraft()
      fireEvent.click(screen.getByRole('button', { name: 'Создать контакт' }))
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/contacts/new-id'))
    })

    it('удаляет черновик из sessionStorage после создания', async () => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(makeDraft()))
      renderWithDraft()
      fireEvent.click(screen.getByRole('button', { name: 'Создать контакт' }))
      await waitFor(() => expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull())
    })

    it('"Отмена" сохраняет черновик, если full_name заполнен', () => {
      const { onClose } = renderWithDraft({ full_name: 'Черновик Контакт' })
      fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
      const saved = sessionStorage.getItem(DRAFT_KEY)
      expect(saved).not.toBeNull()
      expect(JSON.parse(saved!).full_name).toBe('Черновик Контакт')
      expect(onClose).toHaveBeenCalled()
    })

    it('"Отмена" не сохраняет черновик, если full_name пуст', () => {
      const { onClose } = renderWithDraft({ full_name: '' })
      fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull()
      expect(onClose).toHaveBeenCalled()
    })

    it('"+ Добавить" добавляет строку важной даты', () => {
      renderWithDraft()
      fireEvent.click(screen.getByText('+ Добавить'))
      expect(screen.getByPlaceholderText('Название (напр. Годовщина)')).toBeInTheDocument()
    })

    it('рендерит важные даты из черновика', () => {
      renderWithDraft({
        important_dates: [{ label: 'Годовщина', date: '2020-05-01' }],
      })
      expect(screen.getByDisplayValue('Годовщина')).toBeInTheDocument()
    })

    it('кнопка удаления убирает строку даты', () => {
      renderWithDraft({
        important_dates: [{ label: 'Удаляемая дата', date: '2020-05-01' }],
      })
      expect(screen.getByDisplayValue('Удаляемая дата')).toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('Удалить'))
      expect(screen.queryByDisplayValue('Удаляемая дата')).not.toBeInTheDocument()
    })

    it('показывает "Проверьте данные" как заголовок модала', () => {
      renderWithDraft()
      expect(screen.getByText('Проверьте данные')).toBeInTheDocument()
    })
  })
})
