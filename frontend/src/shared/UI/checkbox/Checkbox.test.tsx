import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders a checkbox input', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('is checked when checked prop is true', () => {
    render(<Checkbox checked={true} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('is not checked when checked prop is false', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('calls onChange with true when unchecked checkbox is clicked', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when checked checkbox is clicked', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={true} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('renders label text when label prop is provided', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Согласен" />)
    expect(screen.getByText('Согласен')).toBeInTheDocument()
  })

  it('does not render label text when label prop is omitted', () => {
    const { container } = render(<Checkbox checked={false} onChange={vi.fn()} />)
    expect(container.querySelectorAll('span')).toHaveLength(1)
  })
})
