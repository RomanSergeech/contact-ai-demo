import { http, HttpResponse } from 'msw'
import { BASE } from '@/shared/tests/msw-base-url'

export const ADMIN_USER_FIXTURE = {
  id: 'u2',
  login: 'new@test.com',
  name: 'Новый Юзер',
  role: 'user',
  image: null,
  ai_system_prompt: null,
}

export const adminHandlers = [

  http.get(`${BASE}/admin/users`, () =>
    HttpResponse.json([ADMIN_USER_FIXTURE]),
  ),

  http.post(`${BASE}/admin/users/create`, () =>
    HttpResponse.json(ADMIN_USER_FIXTURE),
  ),

  http.delete(`${BASE}/admin/users/:id`, () =>
    HttpResponse.json({ ok: true }),
  ),

]
