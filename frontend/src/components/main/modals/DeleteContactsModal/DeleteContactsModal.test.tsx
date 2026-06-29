import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteContactsModal } from './DeleteContactsModal'

const onClose = vi.fn()
const onConfirm = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

describe('DeleteContactsModal', () => {
  it('не рендерит содержимое при active=false', () => {
    render(<DeleteContactsModal active={false} count={3} deleting={false} onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.queryByText('Удалить контакты?')).not.toBeInTheDocument()
  })

  it('показывает заголовок при active=true', () => {
    render(<DeleteContactsModal active={true} count={3} deleting={false} onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.getByText('Удалить контакты?')).toBeInTheDocument()
  })

  it('отображает количество контактов в описании', () => {
    render(<DeleteContactsModal active={true} count={5} deleting={false} onClose={onClose} onConfirm={onConfirm} />)
    expect(screen.getByText(/Будет удалено контактов: 5/)).toBeInTheDocument()
  })

  it('"Отмена" вызывает onClose', () => {
    render(<DeleteContactsModal active={true} count={1} deleting={false} onClose={onClose} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('"Удалить" вызывает onConfirm', () => {
    render(<DeleteContactsModal active={true} count={1} deleting={false} onClose={onClose} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('показывает "Удаление..." и блокирует кнопку при deleting=true', () => {
    render(<DeleteContactsModal active={true} count={1} deleting={true} onClose={onClose} onConfirm={onConfirm} />)
    const btn = screen.getByRole('button', { name: 'Удаление...' })
    expect(btn).toBeDisabled()
  })
})
