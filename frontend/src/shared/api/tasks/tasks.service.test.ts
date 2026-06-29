import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/tests/msw-server'
import TasksService from './tasks.service'
import { TASK_FIXTURE } from './tasks.handlers'

describe('TasksService', () => {

  describe('getAll', () => {
    it('возвращает список задач', async () => {
      const { data } = await TasksService.getAll()

      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('t1')
    })

    it('возвращает пустой список когда задач нет', async () => {
      server.use(
        http.get('http://localhost/tasks', () =>
          HttpResponse.json([]),
        ),
      )

      const { data } = await TasksService.getAll()
      expect(data).toHaveLength(0)
    })

    it('пробрасывает ошибку при 500', async () => {
      server.use(
        http.get('http://localhost/tasks', () =>
          HttpResponse.json({ message: 'Internal Error', errors: [] }, { status: 500 }),
        ),
      )

      await expect(TasksService.getAll()).rejects.toThrow()
    })
  })

  describe('create', () => {
    it('возвращает созданную задачу', async () => {
      const { data } = await TasksService.create({
        title: 'Тест задача', description: '',
        status: 'no_deadline', priority: 'medium',
        contact_id: null, deadline: null,
      })

      expect(data.id).toBe('t1')
    })

    it('передаёт тело запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/task/create', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(TASK_FIXTURE)
        }),
      )

      await TasksService.create({
        title: 'Купить молоко', description: 'срочно',
        status: 'today', priority: 'high',
        contact_id: 'c1', deadline: '2024-06-20',
      })

      expect(body).toEqual({
        title: 'Купить молоко', description: 'срочно',
        status: 'today', priority: 'high',
        contact_id: 'c1', deadline: '2024-06-20',
      })
    })
  })

  describe('update', () => {
    it('возвращает обновлённую задачу', async () => {
      const { data } = await TasksService.update('t1', { status: 'done' })

      expect(data).toBeDefined()
    })

    it('передаёт id и обновления в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/task/update', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(TASK_FIXTURE)
        }),
      )

      await TasksService.update('t42', { title: 'Новое название', status: 'done' })
      expect(body).toEqual({ id: 't42', title: 'Новое название', status: 'done' })
    })
  })

  describe('delete', () => {
    it('возвращает { ok: true }', async () => {
      const { data } = await TasksService.delete('t1')

      expect(data.ok).toBe(true)
    })

    it('передаёт id в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/task/delete', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ ok: true })
        }),
      )

      await TasksService.delete('t99')
      expect(body).toEqual({ id: 't99' })
    })

    it('пробрасывает ошибку при 403', async () => {
      server.use(
        http.post('http://localhost/task/delete', () =>
          HttpResponse.json({ message: 'Forbidden', errors: [] }, { status: 403 }),
        ),
      )

      await expect(TasksService.delete('t1')).rejects.toThrow()
    })
  })

})
