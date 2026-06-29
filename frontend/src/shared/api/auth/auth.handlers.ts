import { http, HttpResponse } from 'msw'
import { BASE } from '@/shared/tests/msw-base-url'

export const authHandlers = [

  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      access_token: 'test-token',
      user: { id: 'u1', name: 'Иван', login: 'ivan@test.com', role: 'user', image: null, ai_system_prompt: null },
    }),
  ),

  http.post(`${BASE}/auth/refresh`, () =>
    HttpResponse.json({
      access_token: 'test-token',
      user: { id: 'u1', name: 'Иван', login: 'ivan@test.com', role: 'user', image: null, ai_system_prompt: null },
    }),
  ),

  http.post(`${BASE}/auth/logout`, () =>
    HttpResponse.json({ ok: true }),
  ),

]
