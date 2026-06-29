import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTasksStore } from './tasksStore'
import { makeTask } from '@/shared/tests/factories'

vi.mock('@/shared/api', async () => ({
  TasksService: (await import('../../tests/__mocks__/tasks.service')).default,
}))

vi.mock('@/shared/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils')>()
  return { ...actual, showAlert: vi.fn() }
})

import { TasksService } from '@/shared/api'
import { showAlert } from '@/shared/utils'

const apiError = new Error('API error')

beforeEach(() => {
  useTasksStore.setState({ tasks: [], openedTaskId: null, loading: false })
  vi.clearAllMocks()
})

describe('tasks.store', () => {
  describe('loadTasks', () => {
    it('sets tasks from API response', async () => {
      const tasks = [makeTask({ id: '1' }), makeTask({ id: '2' })]
      vi.mocked(TasksService.getAll).mockResolvedValue({ data: tasks } as never)

      await useTasksStore.getState().loadTasks()

      expect(useTasksStore.getState().tasks).toEqual(tasks)
    })

    it('resets loading to false on success', async () => {
      vi.mocked(TasksService.getAll).mockResolvedValue({ data: { tasks: [] } } as never)

      await useTasksStore.getState().loadTasks()

      expect(useTasksStore.getState().loading).toBe(false)
    })

    it('resets loading to false on API failure', async () => {
      vi.mocked(TasksService.getAll).mockRejectedValue(apiError)

      await expect(useTasksStore.getState().loadTasks()).rejects.toThrow()
      expect(useTasksStore.getState().loading).toBe(false)
    })

    it('does not mutate tasks on API failure', async () => {
      const existing = [makeTask({ id: '1' })]
      useTasksStore.setState({ tasks: existing })
      vi.mocked(TasksService.getAll).mockRejectedValue(apiError)

      await expect(useTasksStore.getState().loadTasks()).rejects.toThrow()
      expect(useTasksStore.getState().tasks).toEqual(existing)
    })
  })

  describe('openTask / closeTask', () => {
    it('openTask sets openedTaskId', () => {
      useTasksStore.getState().openTask('42')
      expect(useTasksStore.getState().openedTaskId).toBe('42')
    })

    it('closeTask clears openedTaskId', () => {
      useTasksStore.getState().openTask('42')
      useTasksStore.getState().closeTask()
      expect(useTasksStore.getState().openedTaskId).toBeNull()
    })
  })

  describe('createTask', () => {
    it('does not mutate tasks on API failure', async () => {
      const existing = [makeTask({ id: '1' })]
      useTasksStore.setState({ tasks: existing })
      vi.mocked(TasksService.create).mockRejectedValue(apiError)

      await expect(useTasksStore.getState().createTask({
        title: 'New', description: '', status: 'no_deadline',
        priority: 'medium', contact_id: null, deadline: null,
      })).rejects.toThrow()
      expect(useTasksStore.getState().tasks).toEqual(existing)
    })

    it('appends the created task to the list', async () => {
      const existing = makeTask({ id: '0' })
      useTasksStore.setState({ tasks: [existing] })

      const created = makeTask({ id: '1', title: 'New' })
      vi.mocked(TasksService.create).mockResolvedValue({ data: created } as never)

      await useTasksStore.getState().createTask({
        title: 'New', description: '', status: 'no_deadline',
        priority: 'medium', contact_id: null, deadline: null,
      })

      const { tasks } = useTasksStore.getState()
      expect(tasks).toHaveLength(2)
      expect(tasks[tasks.length - 1]).toEqual(created)
    })
  })

  describe('updateTask', () => {
    it('does not mutate tasks on API failure', async () => {
      const original = makeTask({ id: '1', title: 'Original' })
      useTasksStore.setState({ tasks: [original] })
      vi.mocked(TasksService.update).mockRejectedValue(apiError)

      await expect(useTasksStore.getState().updateTask('1', { title: 'Changed' })).rejects.toThrow()
      expect(useTasksStore.getState().tasks[0].title).toBe('Original')
    })

    it('replaces the matching task in the list', async () => {
      const original = makeTask({ id: '1', title: 'Old' })
      const updated = makeTask({ id: '1', title: 'Updated' })
      useTasksStore.setState({ tasks: [original] })

      vi.mocked(TasksService.update).mockResolvedValue({ data: updated } as never)
      await useTasksStore.getState().updateTask('1', { title: 'Updated' })

      expect(useTasksStore.getState().tasks[0].title).toBe('Updated')
    })
  })

  describe('deleteTask', () => {
    it('keeps the task in the list on API failure', async () => {
      useTasksStore.setState({ tasks: [makeTask({ id: '1' })] })
      vi.mocked(TasksService.delete).mockRejectedValue(apiError)

      await expect(useTasksStore.getState().deleteTask('1')).rejects.toThrow()
      expect(useTasksStore.getState().tasks).toHaveLength(1)
    })

    it('preserves openedTaskId on API failure', async () => {
      useTasksStore.setState({ tasks: [makeTask({ id: '1' })], openedTaskId: '1' })
      vi.mocked(TasksService.delete).mockRejectedValue(apiError)

      await expect(useTasksStore.getState().deleteTask('1')).rejects.toThrow()
      expect(useTasksStore.getState().openedTaskId).toBe('1')
    })

    it('removes the deleted task from the list', async () => {
      useTasksStore.setState({ tasks: [makeTask({ id: '1' }), makeTask({ id: '2' })] })
      vi.mocked(TasksService.delete).mockResolvedValue(undefined as never)

      await useTasksStore.getState().deleteTask('1')

      const { tasks } = useTasksStore.getState()
      expect(tasks).toHaveLength(1)
      expect(tasks[0].id).toBe('2')
    })

    it('clears openedTaskId when the opened task is deleted', async () => {
      useTasksStore.setState({ tasks: [makeTask({ id: '1' })], openedTaskId: '1' })
      vi.mocked(TasksService.delete).mockResolvedValue(undefined as never)

      await useTasksStore.getState().deleteTask('1')

      expect(useTasksStore.getState().openedTaskId).toBeNull()
    })

    it('preserves openedTaskId when a different task is deleted', async () => {
      useTasksStore.setState({
        tasks: [makeTask({ id: '1' }), makeTask({ id: '2' })],
        openedTaskId: '1',
      })
      vi.mocked(TasksService.delete).mockResolvedValue(undefined as never)

      await useTasksStore.getState().deleteTask('2')

      expect(useTasksStore.getState().openedTaskId).toBe('1')
    })
  })

  describe('moveTask', () => {
    it('does not mutate task status on API failure', async () => {
      const task = makeTask({ id: '1', status: 'no_deadline' })
      useTasksStore.setState({ tasks: [task] })
      vi.mocked(TasksService.update).mockRejectedValue(apiError)

      await expect(useTasksStore.getState().moveTask('1', 'done')).rejects.toThrow()
      expect(useTasksStore.getState().tasks[0].status).toBe('no_deadline')
    })

    it('updates the task status via the API', async () => {
      const task = makeTask({ id: '1', status: 'no_deadline' })
      const moved = makeTask({ id: '1', status: 'done' })
      useTasksStore.setState({ tasks: [task] })

      vi.mocked(TasksService.update).mockResolvedValue({ data: moved } as never)
      await useTasksStore.getState().moveTask('1', 'done')

      expect(TasksService.update).toHaveBeenCalledWith('1', { status: 'done' })
      expect(useTasksStore.getState().tasks[0].status).toBe('done')
    })
  })

  describe('showAlert on mutation error', () => {
    it('createTask calls showAlert on API failure', async () => {
      vi.mocked(TasksService.create).mockRejectedValue(new Error('Ошибка создания'))

      await expect(useTasksStore.getState().createTask({
        title: 'Test', description: '', status: 'no_deadline',
        priority: 'medium', contact_id: null, deadline: null,
      })).rejects.toThrow()
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка создания'], btnText: 'Закрыть' },
        5000,
      )
    })

    it('updateTask calls showAlert on API failure', async () => {
      useTasksStore.setState({ tasks: [makeTask({ id: '1' })] })
      vi.mocked(TasksService.update).mockRejectedValue(new Error('Ошибка обновления'))

      await expect(useTasksStore.getState().updateTask('1', { title: 'X' })).rejects.toThrow()
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка обновления'], btnText: 'Закрыть' },
        5000,
      )
    })

    it('deleteTask calls showAlert on API failure', async () => {
      useTasksStore.setState({ tasks: [makeTask({ id: '1' })] })
      vi.mocked(TasksService.delete).mockRejectedValue(new Error('Ошибка удаления'))

      await expect(useTasksStore.getState().deleteTask('1')).rejects.toThrow()
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка удаления'], btnText: 'Закрыть' },
        5000,
      )
    })

    it('moveTask calls showAlert on API failure', async () => {
      useTasksStore.setState({ tasks: [makeTask({ id: '1', status: 'no_deadline' })] })
      vi.mocked(TasksService.update).mockRejectedValue(new Error('Ошибка перемещения'))

      await expect(useTasksStore.getState().moveTask('1', 'done')).rejects.toThrow()
      expect(showAlert).toHaveBeenCalledWith(
        { text: ['Ошибка перемещения'], btnText: 'Закрыть' },
        5000,
      )
    })
  })
})
