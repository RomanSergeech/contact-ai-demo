import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Alert } from './Alert'
import { useAlertStore } from '@/shared/store'

const showAlert = (text: string[], btnText = 'OK') => {
  useAlertStore.setState({
    visible: true,
    alert:   { text, btnText },
  })
}

beforeEach(() => {
  useAlertStore.setState({ alert: null, visible: false })
})

describe('Alert', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<Alert />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when visible but alert is null', () => {
    useAlertStore.setState({ visible: true, alert: null })
    const { container } = render(<Alert />)
    expect(container.firstChild).toBeNull()
  })

  it('renders alert text when visible', () => {
    showAlert(['Произошла ошибка'])
    render(<Alert />)
    expect(screen.getByText('Произошла ошибка')).toBeInTheDocument()
  })

  it('renders multiple text lines as separate paragraphs', () => {
    showAlert(['Строка 1', 'Строка 2'])
    render(<Alert />)
    expect(screen.getByText('Строка 1')).toBeInTheDocument()
    expect(screen.getByText('Строка 2')).toBeInTheDocument()
  })

  it('renders the button with btnText', () => {
    showAlert(['msg'], 'Закрыть')
    render(<Alert />)
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument()
  })

  it('hides when button is clicked', () => {
    showAlert(['msg'], 'OK')
    render(<Alert />)
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(useAlertStore.getState().visible).toBe(false)
  })

  it('hides when overlay is clicked', () => {
    showAlert(['msg'], 'OK')
    const { container } = render(<Alert />)
    fireEvent.click(container.firstChild!)
    expect(useAlertStore.getState().visible).toBe(false)
  })
})
