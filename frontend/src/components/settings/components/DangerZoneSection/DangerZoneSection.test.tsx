import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DangerZoneSection } from './DangerZoneSection'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}))

vi.mock('@/shared/store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, showAlert: vi.fn() }
})

import { useAuthStore } from '@/shared/store'
import { showAlert } from '@/shared/utils'

const mockDeleteAccount = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuthStore).mockImplementation((sel: any) => sel({ deleteAccount: mockDeleteAccount }))
})

describe('DangerZoneSection', () => {
  it('показывает кнопку "Удалить аккаунт" изначально', () => {
    render(<DangerZoneSection />)
    expect(screen.getByRole('button', { name: 'Удалить аккаунт' })).toBeInTheDocument()
  })

  it('клик "Удалить аккаунт" показывает диалог подтверждения', () => {
    render(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    expect(screen.getByText('Вы уверены? Это действие нельзя отменить.')).toBeInTheDocument()
  })

  it('"Отмена" в диалоге скрывает подтверждение', () => {
    render(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(screen.queryByText('Вы уверены? Это действие нельзя отменить.')).not.toBeInTheDocument()
  })

  it('"Да, удалить" вызывает deleteAccount', async () => {
    render(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled())
  })

  it('редиректит на "/" после удаления аккаунта', async () => {
    render(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
  })

  it('"Да, удалить" заблокирована во время удаления', () => {
    mockDeleteAccount.mockReturnValue(new Promise(() => {}))
    render(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
    expect(screen.getByRole('button', { name: 'Удаление...' })).toBeDisabled()
  })

  it('показывает alert при ошибке удаления', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error('Ошибка сервера'))
    render(<DangerZoneSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }))
    fireEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка сервера'], btnText: 'Закрыть' },
        5000,
      )
    )
  })
})
