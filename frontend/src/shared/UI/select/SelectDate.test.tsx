import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectDate } from './SelectDate'

describe('SelectDate', () => {
  it('renders a date input', () => {
    render(<SelectDate value={null} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('—')).toBeInTheDocument()
  })

  it('shows the selected date formatted as dd.MM.yyyy', () => {
    render(<SelectDate value="2024-06-15" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('15.06.2024')).toBeInTheDocument()
  })

  it('shows placeholder when value is null', () => {
    render(<SelectDate value={null} onChange={vi.fn()} />)
    const input = screen.getByPlaceholderText('—')
    expect(input).toHaveValue('')
  })

  it('input is readonly when readOnly prop is true', () => {
    render(<SelectDate value={null} onChange={vi.fn()} readOnly />)
    expect(screen.getByPlaceholderText('—')).toHaveAttribute('readonly')
  })
})
