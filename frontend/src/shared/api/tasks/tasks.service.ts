import { $api } from '../../config/api.config'

import type {
  TGetAllTasksResponse,
  TCreateTaskResponse,
  TUpdateTaskResponse,
  TDeleteTaskResponse,
} from '../../types/api.types'
import type { TTask } from '../../types/tasks.types'


class TasksService {

  getAll() {
    return $api.get<TGetAllTasksResponse>('/tasks')
  }

  create(task: Omit<TTask, 'id' | 'user_id' | 'createdAt' | 'completed_at'>) {
    return $api.post<TCreateTaskResponse>('/task/create', task)
  }

  update(id: string, updates: Partial<TTask>) {
    return $api.post<TUpdateTaskResponse>('/task/update', { id, ...updates })
  }

  delete(id: string) {
    return $api.post<TDeleteTaskResponse>('/task/delete', { id })
  }

}

export default new TasksService()
