import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/tests/msw-server'
import AdminService from './admin.service'
import { ADMIN_USER_FIXTURE } from './admin.handlers'

describe('AdminService', () => {

  describe('getUsers', () => {
    it('возвращает список пользователей', async () => {
      const { data } = await AdminService.getUsers()

      expect(data).toHaveLength(1)
      expect(data[0].id).toBe(ADMIN_USER_FIXTURE.id)
    })

    it('возвращает пустой список когда пользователей нет', async () => {
      server.use(
        http.get('http://localhost/admin/users', () =>
          HttpResponse.json([]),
        ),
      )

      const { data } = await AdminService.getUsers()
      expect(data).toHaveLength(0)
    })

    it('пробрасывает ошибку при 403', async () => {
      server.use(
        http.get('http://localhost/admin/users', () =>
          HttpResponse.json({ message: 'Forbidden', errors: [] }, { status: 403 }),
        ),
      )

      await expect(AdminService.getUsers()).rejects.toThrow()
    })
  })

  describe('createUser', () => {
    it('возвращает созданного пользователя', async () => {
      const { data } = await AdminService.createUser({
        name: 'Новый Юзер', login: 'new@test.com', password: 'pass', role: 'user',
      })

      expect(data.id).toBe(ADMIN_USER_FIXTURE.id)
    })

    it('передаёт данные пользователя в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/admin/users/create', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(ADMIN_USER_FIXTURE)
        }),
      )

      await AdminService.createUser({
        name: 'Тест', login: 'test@test.com', password: 'secret', role: 'admin',
      })

      expect(body).toEqual({
        name: 'Тест', login: 'test@test.com', password: 'secret', role: 'admin',
      })
    })

    it('пробрасывает ошибку при конфликте логина (409)', async () => {
      server.use(
        http.post('http://localhost/admin/users/create', () =>
          HttpResponse.json({ message: 'Conflict', errors: [] }, { status: 409 }),
        ),
      )

      await expect(
        AdminService.createUser({ name: 'X', login: 'dup@test.com', password: 'p', role: 'user' }),
      ).rejects.toThrow()
    })
  })

  describe('deleteUser', () => {
    it('возвращает { ok: true }', async () => {
      const { data } = await AdminService.deleteUser('u2')

      expect(data.ok).toBe(true)
    })

    it('передаёт id в URL', async () => {
      let capturedId: string | undefined

      server.use(
        http.delete('http://localhost/admin/users/:id', ({ params }) => {
          capturedId = params.id as string
          return HttpResponse.json({ ok: true })
        }),
      )

      await AdminService.deleteUser('u99')
      expect(capturedId).toBe('u99')
    })

    it('пробрасывает ошибку при 403', async () => {
      server.use(
        http.delete('http://localhost/admin/users/:id', () =>
          HttpResponse.json({ message: 'Forbidden', errors: [] }, { status: 403 }),
        ),
      )

      await expect(AdminService.deleteUser('u2')).rejects.toThrow()
    })
  })

})
