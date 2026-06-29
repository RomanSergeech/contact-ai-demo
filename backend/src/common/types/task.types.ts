export type TTaskStatus   = 'overdue' | 'today' | 'this_week' | 'no_deadline' | 'done'
export type TTaskPriority = 'low' | 'medium' | 'high'

export type TTask = {
  id:           string
  user_id:      string
  contact_id:   string | null
  title:        string
  description:  string
  status:       TTaskStatus
  priority:     TTaskPriority
  deadline:     string | null
  completed_at: string | null
  createdAt:    string
}
