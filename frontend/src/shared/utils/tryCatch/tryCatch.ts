type TProps<T> = {
  callback: () => Promise<T>
  onError?: (msg: string) => void
  onFinally?: () => void
}

export const tryCatch = async <T = void>({ callback, onError, onFinally }: TProps<T>): Promise<T> => {
  try {
    return await callback()
  } catch (err) {
    // Ошибки API приходят уже как обычный Error (нормализованы в response-интерсепторе),
    // включая сетевые сбои ("Нет соединения с сервером")
    const message = err instanceof Error ? err.message : 'Что-то пошло не так'
    onError?.(message)
    throw err
  } finally {
    onFinally?.()
  }
}
