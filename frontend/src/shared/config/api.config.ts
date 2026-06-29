import axios, { type AxiosError } from 'axios'

const STATIC_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? '').replace(/\/api\/?$/, '')

const $api = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_DOMAIN,
  withCredentials: true,
})

$api.interceptors.response.use(
  response => response,
  (error: AxiosError<{ message?: string }>) => {
    // Нет response — сетевой сбой/таймаут; иначе берём сообщение от сервера
    const message = error.response
      ? (error.response.data?.message ?? 'Что-то пошло не так')
      : 'Нет соединения с сервером'
    return Promise.reject(new Error(message))
  },
)

export { $api, STATIC_URL }
