import { http, HttpResponse } from 'msw'
import { BASE } from '@/shared/tests/msw-base-url'

export const CONTACT_FIXTURE = {
  id: 'c1',
  user_id: 'u1',
  full_name: 'Иван Иванов',
  photo: null,
  position: 'CTO',
  company: 'ООО Тест',
  direction: null,
  priority: 'medium',
  relationship_level: 'warm',
  last_contact: null,
  birth_date: null,
  goals: null,
  main_pain: null,
  interests: null,
  dream: null,
  personal_traits: null,
  useful_to_me: null,
  useful_to_them: null,
  contact_info: null,
  important_dates: [],
  created_at: '2024-01-01',
}

export const contactHandlers = [

  http.get(`${BASE}/contacts`, () =>
    HttpResponse.json([CONTACT_FIXTURE]),
  ),

  http.get(`${BASE}/contact/:id`, () =>
    HttpResponse.json(CONTACT_FIXTURE),
  ),

  http.post(`${BASE}/contact/create`, () =>
    HttpResponse.json(CONTACT_FIXTURE),
  ),

  http.post(`${BASE}/contact/update`, () =>
    HttpResponse.json(CONTACT_FIXTURE),
  ),

  http.post(`${BASE}/contact/delete`, () =>
    HttpResponse.json({ ok: true }),
  ),

  http.post(`${BASE}/contact/photo`, () =>
    HttpResponse.json({ photo: 'photo-url.jpg' }),
  ),

]
