import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Collapsible } from './Collapsible'

describe('Collapsible', () => {
  it('рендерит заголовок', () => {
    render(<Collapsible title="Раздел">Контент</Collapsible>)
    expect(screen.getByText('Раздел')).toBeInTheDocument()
  })

  it('по умолчанию закрыт — дочерние элементы не видны', () => {
    render(<Collapsible title="Раздел">Контент</Collapsible>)
    expect(screen.queryByText('Контент')).not.toBeInTheDocument()
  })

  it('показывает содержимое при defaultOpen=true', () => {
    render(<Collapsible title="Раздел" defaultOpen>Контент</Collapsible>)
    expect(screen.getByText('Контент')).toBeInTheDocument()
  })

  it('открывается при клике на кнопку', () => {
    render(<Collapsible title="Раздел">Контент</Collapsible>)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Контент')).toBeInTheDocument()
  })

  it('закрывается при повторном клике', () => {
    render(<Collapsible title="Раздел" defaultOpen>Контент</Collapsible>)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Контент')).not.toBeInTheDocument()
  })

  it('переключает атрибут data-open на кнопке', () => {
    render(<Collapsible title="Раздел">Контент</Collapsible>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-open', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('data-open', 'true')
  })
})
