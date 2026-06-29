import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Сохранить</Button>)
    expect(screen.getByText('Сохранить')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Нажми</Button>)
    fireEvent.click(screen.getByText('Нажми'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Нажми</Button>)
    fireEvent.click(screen.getByText('Нажми'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Кнопка</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('passes extra html attributes to the button element', () => {
    render(<Button type="submit" aria-label="Отправить форму">OK</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('type', 'submit')
    expect(btn).toHaveAttribute('aria-label', 'Отправить форму')
  })

  it('forwards ref to the button element', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>Ref кнопка</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('uses secondary variant by default', () => {
    render(<Button>Кнопка</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary')
  })

  it('applies the given variant', () => {
    render(<Button variant="primary">Кнопка</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary')
  })

  it('does not set data-icon by default', () => {
    render(<Button>Кнопка</Button>)
    expect(screen.getByRole('button')).not.toHaveAttribute('data-icon')
  })

  it('sets data-icon when iconOnly is passed', () => {
    render(<Button iconOnly aria-label="Иконка">×</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-icon', 'true')
  })
})
