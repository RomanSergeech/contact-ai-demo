import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TasksPage } from './TasksPage'
import { makeTask } from '@/shared/tests/factories'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter:       vi.fn(() => ({ push: mockPush })),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}))

vi.mock('@/shared/store', () => ({
  useTasksStore:    vi.fn(),
  useContactsStore: vi.fn(),
}))

vi.mock('./components/TaskCard/TaskCard', () => ({
  TaskCard: ({ task }: any) => <div data-testid="task-card">{task.title}</div>,
}))

vi.mock('./components/TaskPanel/TaskPanel', () => ({
  TaskPanel: () => null,
}))

vi.mock('./components/CreateTaskModal/CreateTaskModal', () => ({
  CreateTaskModal: ({ isActive, onClose }: any) => isActive ? (
    <div data-testid="create-task-modal">
      <button onClick={onClose}>close-task-modal</button>
    </div>
  ) : null,
}))

import { useTasksStore, useContactsStore } from '@/shared/store'
import { useSearchParams } from 'next/navigation'

const mockMoveTask = vi.fn().mockResolvedValue(undefined)

const setStore = (tasks: ReturnType<typeof makeTask>[], contacts: any[] = []) => {
  const tasksState = { tasks, moveTask: mockMoveTask }
  vi.mocked(useTasksStore).mockImplementation((sel?: any) => sel ? sel(tasksState) : tasksState)
  vi.mocked(useContactsStore).mockImplementation((sel: any) => sel({ contacts }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPush.mockClear()
  vi.mocked(useSearchParams).mockReturnValue({ get: vi.fn(() => null) } as any)
  setStore([])
})

describe('TasksPage', () => {
  describe('columns', () => {
    it('renders all 5 columns', () => {
      render(<TasksPage />)
      expect(screen.getByText('Просрочены')).toBeInTheDocument()
      expect(screen.getByText('На сегодня')).toBeInTheDocument()
      expect(screen.getByText('На этой неделе')).toBeInTheDocument()
      expect(screen.getByText('Без срока')).toBeInTheDocument()
      expect(screen.getByText('Выполнены')).toBeInTheDocument()
    })

    it('shows "Нет задач" in each empty column', () => {
      render(<TasksPage />)
      expect(screen.getAllByText('Нет задач')).toHaveLength(5)
    })

    it('renders task card in the correct column', () => {
      setStore([makeTask({ title: 'Срочная', status: 'today' })])
      render(<TasksPage />)
      expect(screen.getByTestId('task-card')).toHaveTextContent('Срочная')
    })

    it('shows column task count', () => {
      setStore([
        makeTask({ id: 't1', status: 'no_deadline' }),
        makeTask({ id: 't2', status: 'no_deadline' }),
      ])
      render(<TasksPage />)
      // "Без срока" column should show count 2
      const noDlCol = screen.getByText('Без срока').closest('div')!
      expect(noDlCol.textContent).toContain('2')
    })
  })

  describe('create task modal', () => {
    it('opens CreateTaskModal when "+ Создать задачу" is clicked', () => {
      render(<TasksPage />)
      fireEvent.click(screen.getByText('+ Создать задачу'))
      expect(screen.getByTestId('create-task-modal')).toBeInTheDocument()
    })

    it('closes CreateTaskModal when onClose is called', () => {
      render(<TasksPage />)
      fireEvent.click(screen.getByText('+ Создать задачу'))
      fireEvent.click(screen.getByText('close-task-modal'))
      expect(screen.queryByTestId('create-task-modal')).not.toBeInTheDocument()
    })

    it('opens modal automatically when searchParams has createFor', () => {
      vi.mocked(useSearchParams).mockReturnValue({ get: (k: string) => k === 'createFor' ? 'c1' : null } as any)
      render(<TasksPage />)
      expect(screen.getByTestId('create-task-modal')).toBeInTheDocument()
    })
  })

  describe('contact filter', () => {
    it('shows contact filter select', () => {
      setStore([], [{ id: 'c1', full_name: 'Иван Иванов' }])
      render(<TasksPage />)
      fireEvent.click(screen.getByText('Все контакты'))
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
    })

    it('filters tasks by contact when filter is active', () => {
      setStore([
        makeTask({ id: 't1', title: 'Задача Ивана',  contact_id: 'c1', status: 'no_deadline' }),
        makeTask({ id: 't2', title: 'Задача Марии',  contact_id: 'c2', status: 'no_deadline' }),
      ], [
        { id: 'c1', full_name: 'Иван Иванов' },
        { id: 'c2', full_name: 'Мария Петрова' },
      ])
      vi.mocked(useSearchParams).mockReturnValue({ get: (k: string) => k === 'contact' ? 'c1' : null } as any)
      render(<TasksPage />)
      expect(screen.queryByText('Задача Марии')).not.toBeInTheDocument()
      expect(screen.getByText('Задача Ивана')).toBeInTheDocument()
    })
  })

  describe('breadcrumbs', () => {
    it('shows "Контакты / Задачи" breadcrumb by default', () => {
      render(<TasksPage />)
      expect(screen.getByText('Контакты')).toBeInTheDocument()
      expect(screen.getAllByText('Задачи').length).toBeGreaterThan(0)
    })

    it('"Контакты" crumb navigates to /main', () => {
      render(<TasksPage />)
      fireEvent.click(screen.getByText('Контакты'))
      expect(mockPush).toHaveBeenCalledWith('/main')
    })
  })
})
