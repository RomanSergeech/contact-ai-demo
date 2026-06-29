import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/tests/msw-server'
import SettingsService from './settings.service'
import { USER_FIXTURE } from './settings.handlers'

describe('SettingsService', () => {

  describe('saveName', () => {
    it('возвращает обновлённого пользователя', async () => {
      const { data } = await SettingsService.saveName('Новое Имя')

      expect(data.id).toBe(USER_FIXTURE.id)
    })

    it('передаёт name в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/user/settings/name', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(USER_FIXTURE)
        }),
      )

      await SettingsService.saveName('Пётр')
      expect(body).toEqual({ name: 'Пётр' })
    })

    it('пробрасывает ошибку при 400', async () => {
      server.use(
        http.post('http://localhost/user/settings/name', () =>
          HttpResponse.json({ message: 'Bad Request', errors: [] }, { status: 400 }),
        ),
      )

      await expect(SettingsService.saveName('')).rejects.toThrow()
    })
  })

  describe('saveAiPrompt', () => {
    it('возвращает обновлённого пользователя', async () => {
      const { data } = await SettingsService.saveAiPrompt('Ты помощник CRM')

      expect(data.id).toBe(USER_FIXTURE.id)
    })

    it('передаёт ai_system_prompt в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/user/settings/save', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(USER_FIXTURE)
        }),
      )

      await SettingsService.saveAiPrompt('Мой промпт')
      expect(body).toEqual({ ai_system_prompt: 'Мой промпт' })
    })
  })

  describe('deleteAccount', () => {
    it('выполняет запрос без ошибок', async () => {
      await expect(SettingsService.deleteAccount()).resolves.toBeDefined()
    })

    it('пробрасывает ошибку при 401', async () => {
      server.use(
        http.delete('http://localhost/user/delete', () =>
          HttpResponse.json({ message: 'Unauthorized', errors: [] }, { status: 401 }),
        ),
      )

      await expect(SettingsService.deleteAccount()).rejects.toThrow()
    })
  })

})
