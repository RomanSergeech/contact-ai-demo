import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContactRow } from './ContactRow'
import { makeContact } from '@/shared/tests/factories'

const onToggleSelect = vi.fn()
const onOpen = vi.fn()

beforeEach(() => { vi.clearAllMocks() })

const defaultProps = {
  contact:        makeContact(),
  index:          0,
  selected:       false,
  onToggleSelect,
  onOpen,
}

describe('ContactRow', () => {
  describe('рендеринг', () => {
    it('показывает full_name', () => {
      render(<ContactRow {...defaultProps} />)
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    })

    it('показывает номер строки (index + 1)', () => {
      render(<ContactRow {...defaultProps} index={4} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('показывает position когда задана', () => {
      render(<ContactRow {...defaultProps} contact={makeContact({ position: 'CTO' })} />)
      expect(screen.getByText('CTO')).toBeInTheDocument()
    })

    it('показывает "—" когда position не задана', () => {
      render(<ContactRow {...defaultProps} contact={makeContact({ position: null })} />)
      expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })

    it('показывает badge приоритета', () => {
      render(<ContactRow {...defaultProps} contact={makeContact({ priority: 'high' })} />)
      expect(screen.getByText('Высокий')).toBeInTheDocument()
    })

    it('показывает badge уровня отношений', () => {
      render(<ContactRow {...defaultProps} contact={makeContact({ relationship_level: 'warm' })} />)
      expect(screen.getByText('Тёплый')).toBeInTheDocument()
    })

    it('устанавливает data-selected=true при selected=true', () => {
      const { container } = render(<ContactRow {...defaultProps} selected={true} />)
      expect(container.firstChild).toHaveAttribute('data-selected', 'true')
    })

    it('устанавливает data-selected=false при selected=false', () => {
      const { container } = render(<ContactRow {...defaultProps} selected={false} />)
      expect(container.firstChild).toHaveAttribute('data-selected', 'false')
    })
  })

  describe('взаимодействие', () => {
    it('вызывает onOpen с id контакта при клике на строку', () => {
      render(<ContactRow {...defaultProps} contact={makeContact({ id: 'c42' })} />)
      fireEvent.click(screen.getByText('Иван Иванов'))
      expect(onOpen).toHaveBeenCalledWith('c42')
    })

    it('клик на чекбокс вызывает onToggleSelect и НЕ вызывает onOpen', () => {
      render(<ContactRow {...defaultProps} contact={makeContact({ id: 'c42' })} />)
      fireEvent.click(screen.getByRole('checkbox'))
      expect(onToggleSelect).toHaveBeenCalledWith('c42')
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('кнопка-стрелка вызывает onOpen', () => {
      render(<ContactRow {...defaultProps} contact={makeContact({ id: 'c42' })} />)
      fireEvent.click(screen.getByTitle('Открыть контакт'))
      expect(onOpen).toHaveBeenCalledWith('c42')
    })
  })
})
