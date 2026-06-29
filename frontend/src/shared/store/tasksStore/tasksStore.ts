import { create } from 'zustand'
import { tryCatch, showAlert } from '../../utils'
import { TasksService } from '../../api'

import type { TTask, TTaskStatus } from '../../types/tasks.types'


interface TState {
  tasks: TTask[]
  openedTaskId: string | null
  loading: boolean
}

interface TStore extends TState {
  loadTasks: () => Promise<void>
  openTask: (id: string) => void
  closeTask: () => void
  createTask: (task: Omit<TTask, 'id' | 'user_id' | 'createdAt' | 'completed_at'>) => Promise<void>
  updateTask: (id: string, updates: Partial<TTask>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, status: TTaskStatus) => Promise<void>
}

const initialState: TState = {
  tasks: [],
  openedTaskId: null,
  loading: false,
}

const onError = (msg: string) => showAlert({ text: [msg], btnText: 'Закрыть' }, 5000)

export const useTasksStore = create<TStore>((set) => ({
  ...initialState,

  loadTasks: () => tryCatch({
    callback: async () => {
      set({ loading: true })
      const { data } = await TasksService.getAll()
      set({ tasks: data })
    },
    onFinally: () => set({ loading: false }),
  }),

  openTask: (id) => set({ openedTaskId: id }),
  closeTask: () => set({ openedTaskId: null }),

  createTask: (task) => tryCatch({
    callback: async () => {
      const { data: created } = await TasksService.create(task)
      set((s) => ({ tasks: [...s.tasks, created] }))
    },
    onError,
  }),

  updateTask: (id, updates) => tryCatch({
    callback: async () => {
      const { data: updated } = await TasksService.update(id, updates)
      set((s) => ({ tasks: s.tasks.map(t => t.id === id ? updated : t) }))
    },
    onError,
  }),

  deleteTask: (id) => tryCatch({
    callback: async () => {
      await TasksService.delete(id)
      set((s) => ({
        tasks: s.tasks.filter(t => t.id !== id),
        openedTaskId: s.openedTaskId === id ? null : s.openedTaskId,
      }))
    },
    onError,
  }),

  moveTask: (id, status) => tryCatch({
    callback: async () => {
      const { data: updated } = await TasksService.update(id, { status })
      set((s) => ({ tasks: s.tasks.map(t => t.id === id ? updated : t) }))
    },
    onError,
  }),
}))
