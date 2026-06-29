import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MainToolbar } from './MainToolbar'

const defaultProps = {
  selectedCount: 0,
  deletingMany:  false,
  hasDraft:      false,
  onDeleteClick: vi.fn(),
  onDraftClick:  vi.fn(),
  onCreateClick: vi.fn(),
  onVoiceClick:  vi.fn(),
}

beforeEach(() => { vi.clearAllMocks() })

describe('MainToolbar', () => {
  describe('кнопка добавления контакта', () => {
    it('всегда отображается', () => {
      render(<MainToolbar {...defaultProps} />)
      expect(screen.getByText('+ Добавить контакт')).toBeInTheDocument()
    })

    it('вызывает onCreateClick при клике', () => {
      const onCreateClick = vi.fn()
      render(<MainToolbar {...defaultProps} onCreateClick={onCreateClick} />)
      fireEvent.click(screen.getByRole('button', { name: '+ Добавить контакт' }))
      expect(onCreateClick).toHaveBeenCalled()
    })
  })

  describe('микрофон', () => {
    it('вызывает onVoiceClick при клике', () => {
      const onVoiceClick = vi.fn()
      render(<MainToolbar {...defaultProps} onVoiceClick={onVoiceClick} />)
      fireEvent.click(screen.getByTitle('Создать контакт голосом'))
      expect(onVoiceClick).toHaveBeenCalled()
    })
  })

  describe('кнопка удаления', () => {
    it('не показывается при selectedCount=0', () => {
      render(<MainToolbar {...defaultProps} selectedCount={0} />)
      expect(screen.queryByText('Удалить')).not.toBeInTheDocument()
    })

    it('показывается при selectedCount > 0', () => {
      render(<MainToolbar {...defaultProps} selectedCount={2} />)
      expect(screen.getByText('Удалить')).toBeInTheDocument()
    })

    it('заблокирована при deletingMany=true', () => {
      render(<MainToolbar {...defaultProps} selectedCount={2} deletingMany={true} />)
      expect(screen.getByText('Удалить').closest('button')).toBeDisabled()
    })

    it('вызывает onDeleteClick при клике', () => {
      const onDeleteClick = vi.fn()
      render(<MainToolbar {...defaultProps} selectedCount={1} onDeleteClick={onDeleteClick} />)
      fireEvent.click(screen.getByText('Удалить').closest('button')!)
      expect(onDeleteClick).toHaveBeenCalled()
    })
  })

  describe('кнопка черновика', () => {
    it('не показывается при hasDraft=false', () => {
      render(<MainToolbar {...defaultProps} hasDraft={false} />)
      expect(screen.queryByText('Черновик')).not.toBeInTheDocument()
    })

    it('показывается при hasDraft=true', () => {
      render(<MainToolbar {...defaultProps} hasDraft={true} />)
      expect(screen.getByText('Черновик')).toBeInTheDocument()
    })

    it('вызывает onDraftClick при клике', () => {
      const onDraftClick = vi.fn()
      render(<MainToolbar {...defaultProps} hasDraft={true} onDraftClick={onDraftClick} />)
      fireEvent.click(screen.getByTitle('Открыть черновик контакта'))
      expect(onDraftClick).toHaveBeenCalled()
    })
  })
})
