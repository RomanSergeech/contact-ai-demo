import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/tests/msw-server'
import AuthService from './auth.service'

describe('AuthService', () => {

  describe('login', () => {
    it('возвращает токен и пользователя', async () => {
      const { data } = await AuthService.login({ login: 'ivan@test.com', password: '123456' })

      expect(data.user.login).toBe('ivan@test.com')
    })

    it('передаёт credentials в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/auth/login', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ user: {} })
        }),
      )

      await AuthService.login({ login: 'test@test.com', password: 'pass' })

      expect(body).toEqual({ login: 'test@test.com', password: 'pass' })
    })

    it('пробрасывает ошибку при 401', async () => {
      server.use(
        http.post('http://localhost/auth/login', () =>
          HttpResponse.json({ message: 'Unauthorized', errors: [] }, { status: 401 }),
        ),
      )

      await expect(AuthService.login({ login: 'bad@test.com', password: 'wrong' })).rejects.toThrow()
    })
  })

  describe('checkAuth', () => {
    it('возвращает токен и пользователя', async () => {
      const { data } = await AuthService.checkAuth()

      expect(data.user.id).toBe('u1')
    })

    it('пробрасывает ошибку при 401', async () => {
      server.use(
        http.post('http://localhost/auth/refresh', () =>
          HttpResponse.json({ message: 'Unauthorized', errors: [] }, { status: 401 }),
        ),
      )

      await expect(AuthService.checkAuth()).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('выполняет запрос без ошибок', async () => {
      await expect(AuthService.logout()).resolves.toBeDefined()
    })
  })

})
