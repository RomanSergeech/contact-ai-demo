import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { $api } from '../api.config'

const getResponseInterceptor = () => {
  const manager = ($api.interceptors.response as any)
  const handler = manager.handlers.find(Boolean)
  return handler as {
    fulfilled: (r: unknown) => unknown
    rejected:  (e: unknown) => Promise<never>
  }
}

const makeAxiosError = (opts: { message?: string; hasResponse?: boolean } = {}): AxiosError => {
  const err = new AxiosError()
  if (opts.hasResponse !== false) {
    ;(err as any).response = opts.message !== undefined
      ? { data: { message: opts.message } }
      : { data: {} }
  }
  return err
}

describe('$api response interceptor', () => {
  it('passes successful responses through unchanged', () => {
    const response = { status: 200, data: { ok: true } }
    expect(getResponseInterceptor().fulfilled(response)).toBe(response)
  })

  it('rejects with Error using response.data.message', async () => {
    await expect(
      getResponseInterceptor().rejected(makeAxiosError({ message: 'Неверный логин' })),
    ).rejects.toThrow('Неверный логин')
  })

  it('falls back to default message when response.data.message is absent', async () => {
    await expect(
      getResponseInterceptor().rejected(makeAxiosError()),
    ).rejects.toThrow('Что-то пошло не так')
  })

  it('reports a network message on failure with no response', async () => {
    await expect(
      getResponseInterceptor().rejected(makeAxiosError({ hasResponse: false })),
    ).rejects.toThrow('Нет соединения с сервером')
  })

  it('rejects with a plain Error, not AxiosError', async () => {
    const caught = await getResponseInterceptor()
      .rejected(makeAxiosError({ message: 'msg' }))
      .catch((e: Error) => e)
    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(AxiosError)
  })
})
