export type TTaskStatus = 'overdue' | 'today' | 'this_week' | 'no_deadline' | 'done'
export type TTaskPriority = 'low' | 'medium' | 'high'

export const TASK_PRIORITY_OPTIONS: { value: TTaskPriority; label: string }[] = [
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' },
]

export const TASK_STATUS_OPTIONS: { value: TTaskStatus; label: string }[] = [
  { value: 'overdue', label: 'Просрочена' },
  { value: 'today', label: 'На сегодня' },
  { value: 'this_week', label: 'На этой неделе' },
  { value: 'no_deadline', label: 'Без срока' },
  { value: 'done', label: 'Выполнена' },
]

export const PRIORITY_LABEL: Record<TTaskPriority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

export const PRIORITY_COLOR: Record<TTaskPriority, string> = {
  high: 'var(--color-red)',
  medium: 'var(--color-orange)',
  low: 'var(--color-green)',
}

export type TTask = {
  id: string
  user_id: string
  contact_id: string | null
  title: string
  description: string
  status: TTaskStatus
  priority: TTaskPriority
  deadline: string | null
  completed_at: string | null
  createdAt: string
}
