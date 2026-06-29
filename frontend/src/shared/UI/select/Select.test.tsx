import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Select } from './Select'

// Select uses createPortal — make sure document.body is available in jsdom
const options = [
  { value: 'low',    label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high',   label: 'Высокий' },
]

describe('Select', () => {
  it('renders the selected option label', () => {
    render(<Select options={options} value="medium" onChange={vi.fn()} />)
    expect(screen.getByText('Средний')).toBeInTheDocument()
  })

  it('renders "—" when value does not match any option', () => {
    render(<Select options={options} value="" onChange={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('opens dropdown on trigger click', () => {
    render(<Select options={options} value="low" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Средний')).toBeInTheDocument()
    expect(screen.getByText('Высокий')).toBeInTheDocument()
  })

  it('calls onChange with the selected value when an option is clicked', () => {
    const onChange = vi.fn()
    render(<Select options={options} value="low" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Высокий'))
    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('closes dropdown after selecting an option', () => {
    render(<Select options={options} value="low" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Высокий'))
    expect(screen.queryAllByText('Средний')).toHaveLength(0)
  })

  it('does not open dropdown when disabled', () => {
    render(<Select options={options} value="low" onChange={vi.fn()} disabled />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryAllByText('Средний')).toHaveLength(0)
  })
})
