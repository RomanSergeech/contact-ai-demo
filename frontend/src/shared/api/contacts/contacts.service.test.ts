import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/tests/msw-server'
import ContactsService from './contacts.service'
import { CONTACT_FIXTURE } from './contacts.handlers'

describe('ContactsService', () => {

  describe('getAll', () => {
    it('возвращает список контактов', async () => {
      const { data } = await ContactsService.getAll()

      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('c1')
    })

    it('возвращает пустой список когда контактов нет', async () => {
      server.use(
        http.get('http://localhost/contacts', () =>
          HttpResponse.json([]),
        ),
      )

      const { data } = await ContactsService.getAll()
      expect(data).toHaveLength(0)
    })

    it('пробрасывает ошибку при 500', async () => {
      server.use(
        http.get('http://localhost/contacts', () =>
          HttpResponse.json({ message: 'Internal Error', errors: [] }, { status: 500 }),
        ),
      )

      await expect(ContactsService.getAll()).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('возвращает контакт по id', async () => {
      const { data } = await ContactsService.getById('c1')

      expect(data.full_name).toBe(CONTACT_FIXTURE.full_name)
    })

    it('передаёт id в URL', async () => {
      let capturedId: string | undefined

      server.use(
        http.get('http://localhost/contact/:id', ({ params }) => {
          capturedId = params.id as string
          return HttpResponse.json(CONTACT_FIXTURE)
        }),
      )

      await ContactsService.getById('c42')
      expect(capturedId).toBe('c42')
    })

    it('пробрасывает ошибку при 404', async () => {
      server.use(
        http.get('http://localhost/contact/:id', () =>
          HttpResponse.json({ message: 'Not Found', errors: [] }, { status: 404 }),
        ),
      )

      await expect(ContactsService.getById('missing')).rejects.toThrow()
    })
  })

  describe('create', () => {
    it('возвращает созданный контакт', async () => {
      const { data } = await ContactsService.create({ full_name: 'Иван Иванов' })

      expect(data.id).toBe('c1')
    })

    it('передаёт тело запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/contact/create', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(CONTACT_FIXTURE)
        }),
      )

      await ContactsService.create({ full_name: 'Тест', position: 'Dev' })
      expect(body).toEqual({ full_name: 'Тест', position: 'Dev' })
    })
  })

  describe('update', () => {
    it('возвращает обновлённый контакт', async () => {
      const { data } = await ContactsService.update('c1', { full_name: 'Новое Имя' })

      expect(data).toBeDefined()
    })

    it('передаёт id и обновления в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/contact/update', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(CONTACT_FIXTURE)
        }),
      )

      await ContactsService.update('c1', { position: 'VP' })
      expect(body).toEqual({ id: 'c1', position: 'VP' })
    })
  })

  describe('delete', () => {
    it('возвращает { ok: true }', async () => {
      const { data } = await ContactsService.delete('c1')

      expect(data.ok).toBe(true)
    })

    it('передаёт id в теле запроса', async () => {
      let body: unknown

      server.use(
        http.post('http://localhost/contact/delete', async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ ok: true })
        }),
      )

      await ContactsService.delete('c99')
      expect(body).toEqual({ id: 'c99' })
    })

    it('пробрасывает ошибку при 403', async () => {
      server.use(
        http.post('http://localhost/contact/delete', () =>
          HttpResponse.json({ message: 'Forbidden', errors: [] }, { status: 403 }),
        ),
      )

      await expect(ContactsService.delete('c1')).rejects.toThrow()
    })
  })

  describe('uploadPhoto', () => {
    it('возвращает url фото', async () => {
      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      const { data } = await ContactsService.uploadPhoto('c1', file)

      expect(data.photo).toBe('photo-url.jpg')
    })

    it('отправляет FormData с полями photo и id', async () => {
      let capturedFormData: FormData | undefined

      server.use(
        http.post('http://localhost/contact/photo', async ({ request }) => {
          capturedFormData = await request.formData()
          return HttpResponse.json({ photo: 'photo-url.jpg' })
        }),
      )

      const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      await ContactsService.uploadPhoto('c1', file)

      expect(capturedFormData?.get('id')).toBe('c1')
      expect(capturedFormData?.get('photo')).toBeTruthy()
    })
  })

})
