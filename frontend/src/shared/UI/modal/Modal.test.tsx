import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'

const defaultProps = {
  title:    'Заголовок',
  onClose:  vi.fn(),
  active:   true,
  children: <div>Контент</div>,
}

describe('Modal', () => {
  it('renders the title', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Заголовок')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Контент')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking directly on the overlay', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal {...defaultProps} onClose={onClose} />)
    fireEvent.click(container.firstChild!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when clicking inside the modal content', () => {
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('Контент'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('applies custom maxWidth via inline style', () => {
    const { container } = render(<Modal {...defaultProps} maxWidth={800} />)
    const elements = [...container.querySelectorAll('[style]')] as HTMLElement[]
    const modal = elements.find(el => el.style.maxWidth)
    expect(modal?.style.maxWidth).toBe('800px')
  })
})
