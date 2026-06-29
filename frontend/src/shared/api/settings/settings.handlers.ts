import { http, HttpResponse } from 'msw'
import { BASE } from '@/shared/tests/msw-base-url'

export const USER_FIXTURE = {
  id: 'u1',
  login: 'ivan@test.com',
  name: 'Иван',
  role: 'user',
  image: null,
  ai_system_prompt: null,
}

export const settingsHandlers = [

  http.post(`${BASE}/user/settings/name`, () =>
    HttpResponse.json(USER_FIXTURE),
  ),

  http.post(`${BASE}/user/settings/save`, () =>
    HttpResponse.json(USER_FIXTURE),
  ),

  http.delete(`${BASE}/user/delete`, () =>
    HttpResponse.json({ ok: true }),
  ),

]
