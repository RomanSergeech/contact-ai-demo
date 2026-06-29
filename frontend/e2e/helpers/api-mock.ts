import type { Page } from '@playwright/test'

const r = (path: string) => `**${path}`

const adminUser = { id: 'u1', name: 'Тест Пользователь', login: 'test@test.com', role: 'admin', image: null, ai_system_prompt: null, vk_connected: false, telegram_connected: false }
const regularUser = { id: 'u1', name: 'Тест Пользователь', login: 'test@test.com', role: 'user', image: null, ai_system_prompt: null, vk_connected: false, telegram_connected: false }
const connectedUser = { ...regularUser, vk_connected: true, telegram_connected: true }

export const mockApi = {

  auth: {
    loginSuccess: (page: Page) =>
      page.route(r('/auth/login'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: regularUser }),
        })
      ),

    loginFail: (page: Page) =>
      page.route(r('/auth/login'), route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Неверный логин или пароль' }) })
      ),

    checkAuthSuccess: (page: Page) =>
      page.route(r('/auth/refresh'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: regularUser }),
        })
      ),

    checkAuthSuccessAdmin: (page: Page) =>
      page.route(r('/auth/refresh'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: adminUser }),
        })
      ),

    checkAuthFail: (page: Page) =>
      page.route(r('/auth/refresh'), route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
      ),

    // пользователь с подключёнными VK и Telegram — для скрапинга без модалки подключения
    checkAuthConnected: (page: Page) =>
      page.route(r('/auth/refresh'), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: connectedUser }) })
      ),

    logout: (page: Page) =>
      page.route(r('/auth/logout'), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      ),
  },

  contacts: {
    getAll: (page: Page, contacts: object[] = []) =>
      page.route(r('/contacts'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(contacts),
        })
      ),

    getById: (page: Page, contact: { id: string } & Record<string, unknown>) =>
      page.route(r(`/contact/${contact.id}`), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(contact),
        })
      ),

    create: (page: Page, contact: object) =>
      page.route(r('/contact/create'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(contact),
        })
      ),

    update: (page: Page, contact: object) =>
      page.route(r('/contact/update'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(contact),
        })
      ),

    delete: (page: Page) =>
      page.route(r('/contact/delete'), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      ),

    deleteBulk: (page: Page, deleted: string[], failed: string[] = []) =>
      page.route(r('/contact/delete-bulk'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ deleted, failed }),
        })
      ),

    uploadPhoto: (page: Page, photoPath = '/uploads/test-photo.jpg') =>
      page.route(r('/contact/photo'), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ photo: photoPath }) })
      ),

    getLogs: (page: Page, contactId = 'c1', logs: object[] = []) =>
      page.route(r(`/contact/${contactId}/logs`), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ logs }) })
      ),

    resolveLog: (page: Page, response: object, contactId = 'c1') =>
      page.route(r(`/contact/${contactId}/logs/*/resolve`), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
      ),
  },

  tasks: {
    getAll: (page: Page, tasks: object[] = []) =>
      page.route(r('/tasks'), route => {
        if (route.request().resourceType() === 'document') {
          route.continue()
          return
        }
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(tasks),
        })
      }),

    update: (page: Page, task: object) =>
      page.route(r('/task/update'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(task),
        })
      ),
  },

  settings: {
    saveName: (page: Page, name = 'Тест Пользователь') =>
      page.route(r('/user/settings/name'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...regularUser, name }),
        })
      ),

    saveAiPrompt: (page: Page) =>
      page.route(r('/user/settings/save'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(regularUser),
        })
      ),

    deleteAccount: (page: Page) =>
      page.route(r('/user/delete'), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      ),
  },

  admin: {
    getUsers: (page: Page, users: object[] = []) =>
      page.route(r('/admin/users'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(users),
        })
      ),

    createUser: (page: Page, user: object) =>
      page.route(r('/admin/users/create'), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(user),
        })
      ),

    deleteUser: (page: Page, userId: string) =>
      page.route(r(`/admin/users/${userId}`), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      ),
  },

  ai: {
    getHistory: (page: Page, contactId: string, messages: { role: string; content: string }[] = []) =>
      page.route(r(`/ai/history/${contactId}`), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ history: messages }),
        })
      ),

    sendMessage: (page: Page, contactId: string, replyText: string) =>
      page.route(r(`/ai/${contactId}`), route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ text: replyText }),
        })
      ),

    sendMessageFail: (page: Page, contactId: string) =>
      page.route(r(`/ai/${contactId}`), route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'error' }) })
      ),

    clearHistory: (page: Page, contactId: string) =>
      page.route(r(`/ai/clear/${contactId}`), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      ),

    scrapeVkProfile: (page: Page, response: object) =>
      page.route(r('/ai/scrape-vk-profile'), route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
      ),
  },

}

export const makeContact = (overrides: Record<string, unknown> = {}) => ({
  id:                       'c1',
  user_id:                  'u1',
  full_name:                'Иван Иванов',
  photo:                    null,
  position:                 'Менеджер',
  company:                  'ООО Тест',
  direction:                null,
  priority:                 'medium',
  relationship_level:       'cold',
  last_contact:             null,
  birth_date:               null,
  goals:                    null,
  main_pain:                null,
  interests:                null,
  dream:                    null,
  personal_traits:          null,
  useful_to_me:             null,
  useful_to_them:           null,
  contact_info:             null,
  note:                     null,
  important_dates:          [],
  chat_history:             [],
  recent_activity_summary:  null,
  recent_topics:            null,
  conversation_starters:    null,
  tg_activity_summary:      null,
  tg_recent_topics:         null,
  tg_conversation_starters: null,
  last_vk_analysis_at:      null,
  last_tg_analysis_at:      null,
  next_event_date:          null,
  created_at:               new Date().toISOString(),
  ...overrides,
})

export const makeTask = (overrides: Record<string, unknown> = {}) => ({
  id:           't1',
  user_id:      'u1',
  contact_id:   null,
  title:        'Тестовая задача',
  description:  '',
  status:       'no_deadline',
  priority:     'medium',
  deadline:     null,
  completed_at: null,
  createdAt:    new Date().toISOString(),
  ...overrides,
})

export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id:                 'u2',
  name:               'Другой Пользователь',
  login:              'other@test.com',
  role:               'user',
  image:              null,
  ai_system_prompt:   null,
  vk_connected:       false,
  telegram_connected: false,
  ...overrides,
})

export const setupAuthenticatedSession = async (page: Page, contacts: object[] = [], tasks: object[] = []) => {
  await mockApi.auth.checkAuthSuccess(page)
  await mockApi.contacts.getAll(page, contacts)
  await mockApi.tasks.getAll(page, tasks)
}

export const setupAdminSession = async (page: Page) => {
  await mockApi.auth.checkAuthSuccessAdmin(page)
  await mockApi.contacts.getAll(page)
  await mockApi.tasks.getAll(page)
}
