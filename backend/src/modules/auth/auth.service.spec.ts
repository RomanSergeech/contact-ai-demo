import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { AuthService } from './auth.service'
import { createMockDb, type MockDb } from '../../../test/helpers/mock-db'

const ACCESS_SECRET  = 'access-secret'
const REFRESH_SECRET = 'refresh-secret'

const config = {
  get: (key: string) => (key === 'JWT_ACCESS_SECRET' ? ACCESS_SECRET : key === 'JWT_REFRESH_SECRET' ? REFRESH_SECRET : undefined),
}

const jwt = new JwtService({})
const sha256 = (t: string) => createHash('sha256').update(t).digest('hex')

const signRefresh = (payload: object) => jwt.sign(payload, { secret: REFRESH_SECRET, expiresIn: '30d' })

const makeUser = (over: Record<string, unknown> = {}) => ({
  id:                  'u1',
  login:               'john',
  name:                'John',
  role:                'user',
  password:            bcrypt.hashSync('correct-password', 12),
  refresh_token:       null,
  vk_access_token:     null,
  vk_refresh_token:    null,
  vk_token_expires_at: null,
  vk_user_id:          null,
  telegram_session:    null,
  ...over,
})

let mock: MockDb
let service: AuthService

beforeEach(() => {
  mock = createMockDb()
  service = new AuthService(mock.service, jwt, config as never)
})

describe('login', () => {
  it('успех: выдаёт токены, чистый user без секретов, сохраняет хеш refresh-токена', async () => {
    mock.queueSelect([makeUser()])

    const res = await service.login('john', 'correct-password')

    expect(res.accessToken).toBeTypeOf('string')
    expect(res.refreshToken).toBeTypeOf('string')
    expect(res.user).not.toHaveProperty('password')
    expect(res.user).not.toHaveProperty('refresh_token')
    expect(res.user.vk_connected).toBe(false)
    expect(res.user.telegram_connected).toBe(false)

    // saveRefreshToken записал sha256-хеш именно выданного refresh-токена
    expect(mock.captured.updates).toHaveLength(1)
    expect(mock.captured.updates[0].refresh_token).toBe(sha256(res.refreshToken))
  })

  it('вычисляет vk_connected/telegram_connected по наличию токена/сессии', async () => {
    mock.queueSelect([makeUser({ vk_access_token: 'enc', telegram_session: 'enc' })])
    const res = await service.login('john', 'correct-password')
    expect(res.user.vk_connected).toBe(true)
    expect(res.user.telegram_connected).toBe(true)
  })

  it('неверный пароль → UnauthorizedException, refresh не сохраняется', async () => {
    mock.queueSelect([makeUser()])
    await expect(service.login('john', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(mock.captured.updates).toHaveLength(0)
  })

  it('несуществующий логин → UnauthorizedException', async () => {
    mock.queueSelect([]) // пользователь не найден
    await expect(service.login('ghost', 'whatever')).rejects.toBeInstanceOf(UnauthorizedException)
  })
})

describe('refresh', () => {
  it('отсутствующий токен → UnauthorizedException (без обращения к БД)', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException)
    expect(mock.drizzle.select).not.toHaveBeenCalled()
  })

  it('невалидная подпись → UnauthorizedException', async () => {
    await expect(service.refresh('garbage.token.value')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('валидный неиспользованный токен → новая пара, сохранён хеш нового токена', async () => {
    const token = signRefresh({ id: 'u1', login: 'john', name: 'John', role: 'user' })
    mock.queueSelect([makeUser({ refresh_token: sha256(token) })])

    const res = await service.refresh(token)

    expect(res.refreshToken).toBeTypeOf('string')
    expect(mock.captured.updates).toHaveLength(1)
    // сохранён хеш именно НОВОГО выданного токена
    expect(mock.captured.updates[0].refresh_token).toBe(sha256(res.refreshToken))
  })

  it('повторное использование старого токена → отзыв всех токенов (refresh_token=null) и отказ', async () => {
    const presented = signRefresh({ id: 'u1', login: 'john', name: 'John', role: 'user' })
    // В БД лежит хеш ДРУГОГО (уже ротированного) токена → presented считается скомпрометированным
    mock.queueSelect([makeUser({ refresh_token: sha256('some-other-newer-token') })])

    await expect(service.refresh(presented)).rejects.toBeInstanceOf(UnauthorizedException)

    expect(mock.captured.updates).toHaveLength(1)
    expect(mock.captured.updates[0].refresh_token).toBeNull()
  })

  it('у пользователя нет сохранённого refresh_token → отказ', async () => {
    const token = signRefresh({ id: 'u1', login: 'john', name: 'John', role: 'user' })
    mock.queueSelect([makeUser({ refresh_token: null })])
    await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException)
  })
})

describe('logout', () => {
  it('обнуляет refresh_token', async () => {
    await service.logout('john')
    expect(mock.captured.updates).toEqual([{ refresh_token: null }])
  })
})
