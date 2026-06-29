import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders label when label prop is provided', () => {
    render(<Textarea label="Описание" />)
    expect(screen.getByText('Описание')).toBeInTheDocument()
  })

  it('does not render label when label prop is omitted', () => {
    const { container } = render(<Textarea placeholder="Введите текст" />)
    expect(container.querySelector('label')).not.toBeInTheDocument()
  })

  it('calls onChange when value changes', () => {
    const onChange = vi.fn()
    render(<Textarea onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'текст' } })
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('passes placeholder attribute to the textarea', () => {
    render(<Textarea placeholder="Напишите здесь..." />)
    expect(screen.getByPlaceholderText('Напишите здесь...')).toBeInTheDocument()
  })

  it('forwards ref to the textarea element', () => {
    const ref = { current: null as HTMLTextAreaElement | null }
    render(<Textarea ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  describe('autoResize', () => {
    it('sets style.height on mount', () => {
      render(<Textarea autoResize value="" onChange={vi.fn()} />)
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(ta.style.height).not.toBe('')
    })

    it('sets style.height on change event', () => {
      render(<Textarea autoResize onChange={vi.fn()} />)
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement
      ta.style.height = ''
      fireEvent.change(ta, { target: { value: 'новый текст' } })
      expect(ta.style.height).not.toBe('')
    })

    it('updates style.height when value prop changes', () => {
      const { rerender } = render(<Textarea autoResize value="начало" onChange={vi.fn()} />)
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement
      ta.style.height = ''
      rerender(<Textarea autoResize value="новый длинный текст" onChange={vi.fn()} />)
      expect(ta.style.height).not.toBe('')
    })

    it('does not set style.height without autoResize prop', () => {
      render(<Textarea value="" onChange={vi.fn()} />)
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(ta.style.height).toBe('')
    })
  })
})
