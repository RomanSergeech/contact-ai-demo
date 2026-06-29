import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  createContactSchema,
  createTaskSchema,
  saveNameSchema,
  createUserSchema,
} from './index'

describe('schemas', () => {
  describe('loginSchema', () => {
    it('passes when both fields are non-empty', () => {
      expect(loginSchema.safeParse({ login: 'user', password: 'pass' }).success).toBe(true)
    })

    it('fails when login is empty', () => {
      expect(loginSchema.safeParse({ login: '', password: 'pass' }).success).toBe(false)
    })

    it('fails when password is empty', () => {
      expect(loginSchema.safeParse({ login: 'user', password: '' }).success).toBe(false)
    })
  })

  describe('createContactSchema', () => {
    it('passes when full_name is non-empty', () => {
      expect(createContactSchema.safeParse({ full_name: 'Иван Иванов' }).success).toBe(true)
    })

    it('fails when full_name is empty', () => {
      expect(createContactSchema.safeParse({ full_name: '' }).success).toBe(false)
    })

    it('fails when full_name is whitespace-only', () => {
      expect(createContactSchema.safeParse({ full_name: '   ' }).success).toBe(false)
    })

    it('trims full_name before validation', () => {
      const result = createContactSchema.safeParse({ full_name: '  Иван  ' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.full_name).toBe('Иван')
    })
  })

  describe('createTaskSchema', () => {
    it('passes when title is non-empty', () => {
      expect(createTaskSchema.safeParse({ title: 'Задача' }).success).toBe(true)
    })

    it('fails when title is empty', () => {
      expect(createTaskSchema.safeParse({ title: '' }).success).toBe(false)
    })
  })

  describe('saveNameSchema', () => {
    it('passes when name is non-empty', () => {
      expect(saveNameSchema.safeParse({ name: 'Иван' }).success).toBe(true)
    })

    it('fails when name is empty', () => {
      expect(saveNameSchema.safeParse({ name: '' }).success).toBe(false)
    })
  })

  describe('createUserSchema', () => {
    const valid = { name: 'Иван', login: 'ivan@test.com', password: '123456' }

    it('passes when all fields are correct', () => {
      expect(createUserSchema.safeParse(valid).success).toBe(true)
    })

    it('fails when name is empty', () => {
      expect(createUserSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
    })

    it('fails when login is not a valid email', () => {
      expect(createUserSchema.safeParse({ ...valid, login: 'notanemail' }).success).toBe(false)
    })

    it('fails when password is shorter than 6 chars', () => {
      expect(createUserSchema.safeParse({ ...valid, password: '12345' }).success).toBe(false)
    })

    it('passes when password is exactly 6 chars', () => {
      expect(createUserSchema.safeParse({ ...valid, password: '123456' }).success).toBe(true)
    })
  })
})
