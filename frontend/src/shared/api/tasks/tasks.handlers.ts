import { http, HttpResponse } from 'msw'
import { BASE } from '@/shared/tests/msw-base-url'

export const TASK_FIXTURE = {
  id: 't1',
  user_id: 'u1',
  contact_id: null,
  title: 'Тест задача',
  description: '',
  status: 'no_deadline',
  priority: 'medium',
  deadline: null,
  completed_at: null,
  createdAt: '2024-01-01',
}

export const taskHandlers = [

  http.get(`${BASE}/tasks`, () =>
    HttpResponse.json([TASK_FIXTURE]),
  ),

  http.post(`${BASE}/task/create`, () =>
    HttpResponse.json(TASK_FIXTURE),
  ),

  http.post(`${BASE}/task/update`, () =>
    HttpResponse.json(TASK_FIXTURE),
  ),

  http.post(`${BASE}/task/delete`, () =>
    HttpResponse.json({ ok: true }),
  ),

]
