import { describe, it, expect } from 'vitest'
import { parseContactInfo } from './parseContactInfo'

const EMPTY = {
  phone: '', email: '', telegram_profile: '', telegram_group: '',
  whatsapp: '', instagram: '', vk_profile: '', vk_group: '',
  personal_site: '', company_site: '',
}

describe('parseContactInfo', () => {
  it('возвращает пустой объект при null', () => {
    expect(parseContactInfo(null)).toEqual(EMPTY)
  })

  it('сохраняет заполненные поля', () => {
    const raw = { ...EMPTY, phone: '+7 999 000 00 00', email: 'a@b.com' }
    const result = parseContactInfo(raw)
    expect(result.phone).toBe('+7 999 000 00 00')
    expect(result.email).toBe('a@b.com')
  })

  it('заменяет null/undefined поля на пустую строку', () => {
    const raw = { ...EMPTY, phone: null as unknown as string }
    const result = parseContactInfo(raw)
    expect(result.phone).toBe('')
  })

  it('возвращает все 10 полей', () => {
    const result = parseContactInfo(EMPTY)
    expect(Object.keys(result)).toHaveLength(10)
  })
})
