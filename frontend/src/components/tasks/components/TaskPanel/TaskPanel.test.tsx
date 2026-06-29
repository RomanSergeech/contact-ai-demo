import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskPanel } from './TaskPanel'
import { makeTask } from '@/shared/tests/factories'

vi.mock('@/shared/store', () => ({
  useTasksStore:    vi.fn(),
  useContactsStore: vi.fn(),
}))

import { useTasksStore, useContactsStore } from '@/shared/store'

const mockCloseTask  = vi.fn()
const mockUpdateTask = vi.fn()
const mockDeleteTask = vi.fn()

const setStore = (task: ReturnType<typeof makeTask> | null) => {
  const state = {
    tasks: task ? [task] : [],
    openedTaskId: task?.id ?? null,
    closeTask:  mockCloseTask,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
  }
  vi.mocked(useTasksStore).mockImplementation((sel?: any) => sel ? sel(state) : state)
  vi.mocked(useContactsStore).mockImplementation((sel: any) => sel({ contacts: [] }))
}

beforeEach(() => {
  vi.clearAllMocks()
  setStore(makeTask({ title: 'Тест задача', description: 'Описание' }))
})

describe('TaskPanel', () => {
  it('renders nothing when openedTaskId is null', () => {
    setStore(null)
    const { container } = render(<TaskPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('shows task title in input', () => {
    render(<TaskPanel />)
    expect(screen.getByDisplayValue('Тест задача')).toBeInTheDocument()
  })

  it('shows task description in textarea', () => {
    render(<TaskPanel />)
    expect(screen.getByDisplayValue('Описание')).toBeInTheDocument()
  })

  it('shows "✓ Задача выполнена" button when status is not done', () => {
    render(<TaskPanel />)
    expect(screen.getByText('✓ Задача выполнена')).toBeInTheDocument()
  })

  it('does NOT show "✓ Задача выполнена" when status is done', () => {
    setStore(makeTask({ status: 'done' }))
    render(<TaskPanel />)
    expect(screen.queryByText('✓ Задача выполнена')).not.toBeInTheDocument()
  })

  it('"✓ Задача выполнена" calls updateTask with status done', () => {
    render(<TaskPanel />)
    fireEvent.click(screen.getByText('✓ Задача выполнена'))
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'done' })
  })

  it('"Удалить" calls deleteTask', () => {
    render(<TaskPanel />)
    fireEvent.click(screen.getAllByText('Удалить')[0])
    fireEvent.click(screen.getAllByText('Удалить')[1])
    expect(mockDeleteTask).toHaveBeenCalledWith('t1')
  })

  it('close button calls closeTask', () => {
    render(<TaskPanel />)
    fireEvent.click(screen.getByLabelText('Закрыть'))
    expect(mockCloseTask).toHaveBeenCalled()
  })

  it('Save button is disabled when nothing changed', () => {
    render(<TaskPanel />)
    expect(screen.getByText('Сохранить')).toBeDisabled()
  })

  it('Save button activates after title change', () => {
    render(<TaskPanel />)
    const input = screen.getByDisplayValue('Тест задача')
    fireEvent.change(input, { target: { value: 'Новое название' } })
    expect(screen.getByText('Сохранить')).not.toBeDisabled()
  })

  it('Save button disabled when title is empty', () => {
    render(<TaskPanel />)
    const input = screen.getByDisplayValue('Тест задача')
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByText('Сохранить')).toBeDisabled()
  })

  it('Save button click calls updateTask with current values', () => {
    render(<TaskPanel />)
    const input = screen.getByDisplayValue('Тест задача')
    fireEvent.change(input, { target: { value: 'Изменённое' } })
    fireEvent.click(screen.getByText('Сохранить'))
    expect(mockUpdateTask).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ title: 'Изменённое' }),
    )
  })

  it('Save button does not call updateTask when disabled', () => {
    render(<TaskPanel />)
    fireEvent.click(screen.getByText('Сохранить'))
    expect(mockUpdateTask).not.toHaveBeenCalled()
  })

  it('shows contact options from store', () => {
    vi.mocked(useContactsStore).mockImplementation((sel: any) =>
      sel({ contacts: [{ id: 'c1', full_name: 'Иван Иванов' }] })
    )
    render(<TaskPanel />)
    fireEvent.click(screen.getByText('— Без контакта —'))
    expect(screen.getByText('Иван Иванов')).toBeInTheDocument()
  })
})
