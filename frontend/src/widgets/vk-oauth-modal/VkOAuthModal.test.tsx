import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VkOAuthModal } from './VkOAuthModal'

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, openVkOauthPopup: vi.fn() }
})

import { openVkOauthPopup } from '@/shared/utils'

beforeEach(() => { vi.clearAllMocks() })

describe('VkOAuthModal', () => {
  it('не рендерит содержимое при active=false', () => {
    render(<VkOAuthModal active={false} returnTo="/main" onClose={vi.fn()} />)
    expect(screen.queryByText('Подключить VK')).not.toBeInTheDocument()
  })

  it('показывает заголовок при active=true', () => {
    render(<VkOAuthModal active={true} returnTo="/main" onClose={vi.fn()} />)
    expect(screen.getByText('Подключить VK')).toBeInTheDocument()
  })

  it('"Отмена" вызывает onClose', () => {
    const onClose = vi.fn()
    render(<VkOAuthModal active={true} returnTo="/main" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('кнопка закрытия вызывает onClose', () => {
    const onClose = vi.fn()
    render(<VkOAuthModal active={true} returnTo="/main" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalled()
  })

  it('"Войти через VK" вызывает openVkOauthPopup с переданным returnTo', () => {
    render(<VkOAuthModal active={true} returnTo="/contacts/c42" onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Войти через VK' }))
    expect(openVkOauthPopup).toHaveBeenCalledWith('/contacts/c42')
  })
})
