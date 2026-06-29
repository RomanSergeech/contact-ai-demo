import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConflictField } from './ConflictField'

const onResolve = vi.fn()

const defaultProps = {
  label: 'Имя',
  oldValue: 'Старое',
  newValue: 'Новое',
  onResolve,
}

beforeEach(() => { onResolve.mockClear() })

describe('ConflictField', () => {
  describe('рендеринг', () => {
    it('показывает label и оба значения', () => {
      render(<ConflictField {...defaultProps} />)
      expect(screen.getByText('Имя')).toBeInTheDocument()
      expect(screen.getByText('Старое')).toBeInTheDocument()
      expect(screen.getByText('Новое')).toBeInTheDocument()
    })

    it('показывает кнопку "Объединить" по умолчанию', () => {
      render(<ConflictField {...defaultProps} />)
      expect(screen.getByTitle('Объединить')).toBeInTheDocument()
    })

    it('не показывает кнопку "Объединить" когда mergeable=false', () => {
      render(<ConflictField {...defaultProps} mergeable={false} />)
      expect(screen.queryByTitle('Объединить')).not.toBeInTheDocument()
    })
  })

  describe('взаимодействие', () => {
    it('вызывает onResolve("old") при клике на старое значение', () => {
      const { container } = render(<ConflictField {...defaultProps} />)
      fireEvent.click(container.querySelector('[class*="row_old"]')!)
      expect(onResolve).toHaveBeenCalledWith('old')
    })

    it('вызывает onResolve("new") при клике на новое значение', () => {
      const { container } = render(<ConflictField {...defaultProps} />)
      fireEvent.click(container.querySelector('[class*="row_new"]')!)
      expect(onResolve).toHaveBeenCalledWith('new')
    })

    it('вызывает onResolve("merge") при клике на кнопку объединения', () => {
      render(<ConflictField {...defaultProps} />)
      fireEvent.click(screen.getByTitle('Объединить'))
      expect(onResolve).toHaveBeenCalledWith('merge')
    })
  })

  describe('состояние загрузки', () => {
    it('кнопка "Объединить" заблокирована при loading=true', () => {
      render(<ConflictField {...defaultProps} loading />)
      expect(screen.getByTitle('Объединить')).toBeDisabled()
    })

    it('не вызывает onResolve при клике на строки во время загрузки', () => {
      const { container } = render(<ConflictField {...defaultProps} loading />)
      fireEvent.click(container.querySelector('[class*="row_old"]')!)
      fireEvent.click(container.querySelector('[class*="row_new"]')!)
      expect(onResolve).not.toHaveBeenCalled()
    })
  })
})
