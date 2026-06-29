import { describe, it, expect, vi } from 'vitest'
import { AxiosError } from 'axios'
import { tryCatch } from './tryCatch'

const makeNetworkError = () => new AxiosError('Network Error')


describe('tryCatch', () => {
  describe('success path', () => {
    it('calls callback and resolves without error', async () => {
      const callback = vi.fn().mockResolvedValue(undefined)
      await expect(tryCatch({ callback })).resolves.toBeUndefined()
      expect(callback).toHaveBeenCalledOnce()
    })

    it('calls onFinally on success', async () => {
      const onFinally = vi.fn()
      await tryCatch({ callback: vi.fn().mockResolvedValue(undefined), onFinally })
      expect(onFinally).toHaveBeenCalledOnce()
    })

    it('does not call onError on success', async () => {
      const onError = vi.fn()
      await tryCatch({ callback: vi.fn().mockResolvedValue(undefined), onError })
      expect(onError).not.toHaveBeenCalled()
    })
  })

  describe('API error path (normalized by response interceptor)', () => {
    it('calls onError with error.message', async () => {
      const onError = vi.fn()
      const err = new Error('Пользователь не найден')
      await tryCatch({ callback: vi.fn().mockRejectedValue(err), onError }).catch(() => {})
      expect(onError).toHaveBeenCalledWith('Пользователь не найден')
    })

    it('re-throws the original Error', async () => {
      const err = new Error('Пользователь не найден')
      await expect(tryCatch({ callback: vi.fn().mockRejectedValue(err) })).rejects.toBe(err)
    })

    it('calls onFinally even when error is thrown', async () => {
      const onFinally = vi.fn()
      const err = new Error('fail')
      await tryCatch({ callback: vi.fn().mockRejectedValue(err), onFinally }).catch(() => {})
      expect(onFinally).toHaveBeenCalledOnce()
    })
  })

  // Сетевое сообщение ("Нет соединения с сервером") ставит response-интерсептор;
  // до tryCatch ошибка доходит уже как обычный Error (см. api.config.test).
  // Здесь проверяем, что tryCatch отдаёт onError именно message ошибки.
  describe('raw axios / unexpected errors', () => {
    it('calls onError with the error message', async () => {
      const onError = vi.fn()
      const err = makeNetworkError()
      await tryCatch({ callback: vi.fn().mockRejectedValue(err), onError }).catch(() => {})
      expect(onError).toHaveBeenCalledWith('Network Error')
    })

    it('re-throws the original error', async () => {
      const err = makeNetworkError()
      await expect(tryCatch({ callback: vi.fn().mockRejectedValue(err) })).rejects.toBe(err)
    })

    it('calls onFinally even when error is thrown', async () => {
      const onFinally = vi.fn()
      const err = makeNetworkError()
      await tryCatch({ callback: vi.fn().mockRejectedValue(err), onFinally }).catch(() => {})
      expect(onFinally).toHaveBeenCalledOnce()
    })
  })

  describe('optional callbacks', () => {
    it('works without onError provided', async () => {
      const err = new Error('fail')
      await expect(tryCatch({ callback: vi.fn().mockRejectedValue(err) })).rejects.toBe(err)
    })

    it('works without onFinally provided', async () => {
      await expect(tryCatch({ callback: vi.fn().mockResolvedValue(undefined) })).resolves.toBeUndefined()
    })
  })
})
