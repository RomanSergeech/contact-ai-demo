import { http, HttpResponse } from 'msw'
import { BASE } from '@/shared/tests/msw-base-url'
import { makeContact } from '@/shared/tests/factories'
import type { TContactScrapingLog } from '@/shared/types/contact.types'

export const HISTORY_FIXTURE = [
  { id: 'm1', role: 'user', content: 'Привет', createdAt: '2024-01-01' },
  { id: 'm2', role: 'assistant', content: 'Здравствуй!', createdAt: '2024-01-01' },
]

export const TASK_META_FIXTURE = {
  title: 'Написать письмо',
  priority: 'medium',
  deadline: null,
}

export const VOICE_CONTACT_FIXTURE = {
  full_name: 'Пётр Смирнов',
  position: 'CEO',
  company: 'ООО Рога',
  direction: null,
  goals: null,
  main_pain: null,
  interests: null,
  dream: null,
  personal_traits: null,
  useful_to_me: null,
  useful_to_them: null,
  contact_info: null,
  birth_date: null,
  priority: 'medium',
  relationship_level: 'cold',
  important_dates: [],
}

// общий ответ всех скрапинг-эндпоинтов: { contact, logs }
const ADDED_LOG: TContactScrapingLog = {
  id:             'log1',
  contact_id:     'c1',
  platform:       'vk',
  source:         'profile',
  type:           'added',
  changes:        [{ field: 'position', old_value: null, new_value: 'CTO' }],
  posts_analyzed: null,
  message:        null,
  created_at:     '2024-01-01',
}

export const SCRAPE_FIXTURE = {
  contact: makeContact({ position: 'CTO', company: 'ООО Скрап' }),
  logs:    [ADDED_LOG],
}

export const aiHandlers = [

  http.get(`${BASE}/ai/history/:contactId`, () =>
    HttpResponse.json({ history: HISTORY_FIXTURE }),
  ),

  // конкретные маршруты — до динамического /:contactId
  http.post(`${BASE}/ai/task-meta`, () =>
    HttpResponse.json(TASK_META_FIXTURE),
  ),

  http.post(`${BASE}/ai/contact-from-voice`, () =>
    HttpResponse.json(VOICE_CONTACT_FIXTURE),
  ),

  http.post(`${BASE}/ai/clear/:contactId`, () =>
    HttpResponse.json({ ok: true }),
  ),

  // скрапинг/обогащение — конкретные маршруты, до динамического /:contactId
  http.post(`${BASE}/ai/enrich-from-social`, () =>
    HttpResponse.json(SCRAPE_FIXTURE),
  ),

  http.post(`${BASE}/ai/analyze-activity`, () =>
    HttpResponse.json(SCRAPE_FIXTURE),
  ),

  http.post(`${BASE}/ai/scrape-vk-profile`, () =>
    HttpResponse.json(SCRAPE_FIXTURE),
  ),

  http.post(`${BASE}/ai/scrape-telegram-profile`, () =>
    HttpResponse.json(SCRAPE_FIXTURE),
  ),

  http.post(`${BASE}/ai/enrich-telegram-group`, () =>
    HttpResponse.json(SCRAPE_FIXTURE),
  ),

  http.post(`${BASE}/ai/scrape-website`, () =>
    HttpResponse.json(SCRAPE_FIXTURE),
  ),

  http.post(`${BASE}/ai/:contactId`, () =>
    HttpResponse.json({ text: 'Ответ ИИ' }),
  ),

]
