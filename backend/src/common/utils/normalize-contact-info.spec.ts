import { describe, it, expect } from 'vitest'
import { normalizeContactInfoValue } from './normalize-contact-info'

describe('normalizeContactInfoValue', () => {
  it('telegram_profile: username → полная ссылка t.me, @ срезается', () => {
    expect(normalizeContactInfoValue('telegram_profile', 'durov')).toBe('https://t.me/durov')
    expect(normalizeContactInfoValue('telegram_profile', '@durov')).toBe('https://t.me/durov')
  })

  it('telegram_group тоже через t.me', () => {
    expect(normalizeContactInfoValue('telegram_group', 'mygroup')).toBe('https://t.me/mygroup')
  })

  it('instagram и vk строят свои префиксы', () => {
    expect(normalizeContactInfoValue('instagram', 'nasa')).toBe('https://instagram.com/nasa')
    expect(normalizeContactInfoValue('vk_profile', 'id1')).toBe('https://vk.com/id1')
    expect(normalizeContactInfoValue('vk_group', 'club1')).toBe('https://vk.com/club1')
  })

  it('уже готовый http(s)-URL не трогается', () => {
    expect(normalizeContactInfoValue('telegram_profile', 'https://t.me/durov')).toBe('https://t.me/durov')
    expect(normalizeContactInfoValue('vk_profile', 'HTTP://vk.com/id1')).toBe('HTTP://vk.com/id1')
  })

  it('whatsapp: номер → wa.me только из цифр, + срезается', () => {
    expect(normalizeContactInfoValue('whatsapp', '+7 (999) 123-45-67')).toBe('https://wa.me/79991234567')
  })

  it('whatsapp без цифр возвращается как введён', () => {
    expect(normalizeContactInfoValue('whatsapp', 'нет номера')).toBe('нет номера')
  })

  it('plain-поля (телефон, email, сайты) только триммятся', () => {
    expect(normalizeContactInfoValue('phone', '  +79991234567 ')).toBe('+79991234567')
    expect(normalizeContactInfoValue('email', ' a@b.com ')).toBe('a@b.com')
    expect(normalizeContactInfoValue('personal_site', ' example.com ')).toBe('example.com')
    expect(normalizeContactInfoValue('company_site', 'acme.io')).toBe('acme.io')
  })

  it('обрезает пробелы перед построением ссылки', () => {
    expect(normalizeContactInfoValue('telegram_profile', '  @durov  ')).toBe('https://t.me/durov')
  })
})
