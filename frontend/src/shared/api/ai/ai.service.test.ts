import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/tests/msw-server'
import AiService from './ai.service'
import { HISTORY_FIXTURE, TASK_META_FIXTURE, VOICE_CONTACT_FIXTURE, SCRAPE_FIXTURE } from './ai.handlers'

describe('AiService', () => {

  describe('getHistory', () => {
    it('возвращает историю сообщений', async () => {
      const { data } = await AiService.getHistory('c1')

      expect(data.history).toHaveLength(2)
      expect(data.history[0].content).toBe(HISTORY_FIXTURE[0].content)
    })

    it('передаёт contactId в URL', async () => {
      let capturedId: string | undefined

      server.use(
        http.get('http://localhost/ai/history/:contactId', ({ params }) => {
          capturedId = params.contactId as string
          return HttpResponse.json({ history: [] })
        }),
      )

      await AiService.getHistory('c42')
      expect(capturedId).toBe('c42')
    })

    it('возвращает пустую историю', async () => {
      server.use(
        http.get('http://localhost/ai/history/:contactId', () =>
          HttpResponse.json({ history: [] }),
        ),
      )

      const { data } = await AiService.getHistory('c1')
      expect(data.history).toHaveLength(0)
    })

    it('пробрасывает ошибку при 404', async () => {
      server.use(
        http.get('http://localhost/ai/history/:contactId', () =>
          HttpResponse.json({ message: 'Not Found', errors: [] }, { status: 404 }),
        ),
      )

      await expect(AiService.getHistory('missing')).rejects.toThrow()
    })
  })

  describe('sendMessage', () => {
    it('возвращает текст ответа ИИ', async () => {
      const { data } = await AiService.sendMessage('c1', 'Привет')

      expect(data.text).toBe('Ответ ИИ')
    })

    it('передаёт contactId в URL и message в теле', async () => {
      let capturedId: string | undefined
      let body: unknown

      server.use(
        http.post('http://localhost/ai/:contactId', async ({ params, request }) => {
          capturedId = params.contactId as string
          body = await request.json()
          return HttpResponse.json({ text: 'ok' })
        }),
      )

      await AiService.sendMessage('c5', 'Вопрос')

      expect(capturedId).toBe('c5')
      expect(body).toEqual({ message: 'Вопрос' })
    })

    it('пробрасывает ошибку при 500', async () => {
      server.use(
        http.post('http://localhost/ai/:contactId', () =>
          HttpResponse.json({ message: 'Error', errors: [] }, { status: 500 }),
        ),
      )

      await expect(AiService.sendMessage('c1', 'msg')).rejects.toThrow()
    })
  })

  describe('generateTaskMeta', () => {
    it('возвращает метаданные задачи', async () => {
      const { data } = await AiService.generateTaskMeta('1. Написать письмо')

      expect(data.title).toBe(TASK_META_FIXTURE.title)
      expect(data.priority).toBe(TASK_META_FIXTURE.priority)
    })

    it('передаёт description в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/task-meta', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(TASK_META_FIXTURE)
        }),
      )

      await AiService.generateTaskMeta('Мой план действий')
      expect(body).toEqual({ description: 'Мой план действий' })
    })
  })

  describe('parseContactFromVoice', () => {
    it('возвращает данные контакта', async () => {
      const { data } = await AiService.parseContactFromVoice('Пётр Смирнов, CEO компании ООО Рога')

      expect(data.full_name).toBe(VOICE_CONTACT_FIXTURE.full_name)
    })

    it('передаёт text в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/contact-from-voice', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(VOICE_CONTACT_FIXTURE)
        }),
      )

      await AiService.parseContactFromVoice('Голосовой ввод')
      expect(body).toEqual({ text: 'Голосовой ввод' })
    })

    it('пробрасывает ошибку при 500', async () => {
      server.use(
        http.post('http://localhost/ai/contact-from-voice', () =>
          HttpResponse.json({ message: 'Error', errors: [] }, { status: 500 }),
        ),
      )

      await expect(AiService.parseContactFromVoice('текст')).rejects.toThrow()
    })
  })

  describe('clearHistory', () => {
    it('возвращает { ok: true }', async () => {
      const { data } = await AiService.clearHistory('c1')

      expect(data.ok).toBe(true)
    })

    it('передаёт contactId в URL', async () => {
      let capturedId: string | undefined

      server.use(
        http.post('http://localhost/ai/clear/:contactId', ({ params }) => {
          capturedId = params.contactId as string
          return HttpResponse.json({ ok: true })
        }),
      )

      await AiService.clearHistory('c77')
      expect(capturedId).toBe('c77')
    })

    it('пробрасывает ошибку при 401', async () => {
      server.use(
        http.post('http://localhost/ai/clear/:contactId', () =>
          HttpResponse.json({ message: 'Unauthorized', errors: [] }, { status: 401 }),
        ),
      )

      await expect(AiService.clearHistory('c1')).rejects.toThrow()
    })
  })

  describe('enrichFromSocial', () => {
    it('возвращает контакт и логи', async () => {
      const { data } = await AiService.enrichFromSocial('c1', 'https://vk.com/id1', 'vk')

      expect(data.contact.position).toBe(SCRAPE_FIXTURE.contact.position)
      expect(data.logs).toHaveLength(1)
    })

    it('передаёт contactId, url и platform в теле', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/enrich-from-social', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(SCRAPE_FIXTURE)
        }),
      )

      await AiService.enrichFromSocial('c9', 'https://t.me/u', 'telegram')
      expect(body).toEqual({ contactId: 'c9', url: 'https://t.me/u', platform: 'telegram' })
    })

    it('пробрасывает ошибку при 400', async () => {
      server.use(
        http.post('http://localhost/ai/enrich-from-social', () =>
          HttpResponse.json({ message: 'Bad', errors: [] }, { status: 400 }),
        ),
      )

      await expect(AiService.enrichFromSocial('c1', 'url', 'vk')).rejects.toThrow()
    })
  })

  describe('analyzeActivity', () => {
    it('возвращает контакт и логи', async () => {
      const { data } = await AiService.analyzeActivity('c1', 'profile')

      expect(data.contact.position).toBe(SCRAPE_FIXTURE.contact.position)
    })

    it('передаёт contactId и source в теле', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/analyze-activity', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(SCRAPE_FIXTURE)
        }),
      )

      await AiService.analyzeActivity('c3', 'group')
      expect(body).toEqual({ contactId: 'c3', source: 'group' })
    })
  })

  describe('scrapeVkProfile', () => {
    it('возвращает контакт и логи', async () => {
      const { data } = await AiService.scrapeVkProfile('c1')

      expect(data.contact.company).toBe(SCRAPE_FIXTURE.contact.company)
    })

    it('передаёт contactId в теле', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/scrape-vk-profile', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(SCRAPE_FIXTURE)
        }),
      )

      await AiService.scrapeVkProfile('c7')
      expect(body).toEqual({ contactId: 'c7' })
    })

    it('пробрасывает ошибку при 500', async () => {
      server.use(
        http.post('http://localhost/ai/scrape-vk-profile', () =>
          HttpResponse.json({ message: 'Error', errors: [] }, { status: 500 }),
        ),
      )

      await expect(AiService.scrapeVkProfile('c1')).rejects.toThrow()
    })
  })

  describe('scrapeTelegramProfile', () => {
    it('возвращает контакт и логи', async () => {
      const { data } = await AiService.scrapeTelegramProfile('c1')

      expect(data.logs[0].type).toBe('added')
    })

    it('передаёт contactId в теле', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/scrape-telegram-profile', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(SCRAPE_FIXTURE)
        }),
      )

      await AiService.scrapeTelegramProfile('c8')
      expect(body).toEqual({ contactId: 'c8' })
    })
  })

  describe('enrichTelegramGroup', () => {
    it('возвращает контакт и логи', async () => {
      const { data } = await AiService.enrichTelegramGroup('c1')

      expect(data.contact).toBeDefined()
      expect(data.logs).toHaveLength(1)
    })

    it('передаёт contactId в теле', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/enrich-telegram-group', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(SCRAPE_FIXTURE)
        }),
      )

      await AiService.enrichTelegramGroup('c2')
      expect(body).toEqual({ contactId: 'c2' })
    })
  })

  describe('scrapeWebsite', () => {
    it('возвращает контакт и логи', async () => {
      const { data } = await AiService.scrapeWebsite('c1', 'personal_site')

      expect(data.contact.position).toBe(SCRAPE_FIXTURE.contact.position)
    })

    it('передаёт contactId и field в теле', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/ai/scrape-website', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(SCRAPE_FIXTURE)
        }),
      )

      await AiService.scrapeWebsite('c4', 'company_site')
      expect(body).toEqual({ contactId: 'c4', field: 'company_site' })
    })

    it('пробрасывает ошибку при 500', async () => {
      server.use(
        http.post('http://localhost/ai/scrape-website', () =>
          HttpResponse.json({ message: 'Error', errors: [] }, { status: 500 }),
        ),
      )

      await expect(AiService.scrapeWebsite('c1', 'personal_site')).rejects.toThrow()
    })
  })

})
