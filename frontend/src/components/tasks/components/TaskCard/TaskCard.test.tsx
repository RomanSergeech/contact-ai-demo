import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard } from './TaskCard'
import { makeTask } from '@/shared/tests/factories'

vi.mock('@/shared/store', () => ({
  useTasksStore:    vi.fn(),
  useContactsStore: vi.fn(),
}))

import { useTasksStore, useContactsStore } from '@/shared/store'

const mockOpenTask = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useTasksStore).mockImplementation((sel: any) => sel({ openTask: mockOpenTask }))
  vi.mocked(useContactsStore).mockImplementation((sel: any) => sel({ contacts: [] }))
})

describe('TaskCard', () => {
  describe('rendering', () => {
    it('renders task title', () => {
      render(<TaskCard task={makeTask({ title: 'Тестовая задача' })} />)
      expect(screen.getByText('Тестовая задача')).toBeInTheDocument()
    })

    it('renders priority label', () => {
      render(<TaskCard task={makeTask({ priority: 'high' })} />)
      expect(screen.getByText('Высокий')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      render(<TaskCard task={makeTask({ description: 'Подробности задачи' })} />)
      expect(screen.getByText('Подробности задачи')).toBeInTheDocument()
    })

    it('does not render description when empty', () => {
      render(<TaskCard task={makeTask({ description: '' })} />)
      expect(screen.queryByText('Подробности задачи')).not.toBeInTheDocument()
    })

    it('renders deadline when set', () => {
      render(<TaskCard task={makeTask({ deadline: '2024-06-15' })} />)
      expect(screen.getByText(/15/)).toBeInTheDocument()
    })

    it('does not render deadline when null', () => {
      const { container } = render(<TaskCard task={makeTask({ deadline: null })} />)
      expect(container.querySelector('.card_deadline')).not.toBeInTheDocument()
    })

    it('shows contact name when contact exists', () => {
      vi.mocked(useContactsStore).mockImplementation((sel: any) =>
        sel({ contacts: [{ id: 'c1', full_name: 'Иван Иванов' }] })
      )
      render(<TaskCard task={makeTask({ contact_id: 'c1' })} />)
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    })

    it('does not show contact tag when contact_id is null', () => {
      render(<TaskCard task={makeTask({ contact_id: null })} />)
      expect(screen.queryByTitle(/Иванов/)).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls openTask with task id on click', () => {
      render(<TaskCard task={makeTask({ id: 't42', title: 'Тестовая задача' })} />)
      fireEvent.click(screen.getByText('Тестовая задача'))
      expect(mockOpenTask).toHaveBeenCalledWith('t42')
    })

    it('sets taskId in dataTransfer on drag start', () => {
      render(<TaskCard task={makeTask({ id: 'drag-id', title: 'Тестовая задача' })} />)
      const card = screen.getByText('Тестовая задача').closest('[draggable]')!
      const dt = { setData: vi.fn(), effectAllowed: '' }
      fireEvent.dragStart(card, { dataTransfer: dt })
      expect(dt.setData).toHaveBeenCalledWith('taskId', 'drag-id')
    })
  })
})
