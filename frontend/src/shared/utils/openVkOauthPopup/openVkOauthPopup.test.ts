import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openVkOauthPopup } from './openVkOauthPopup'

let windowOpenSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(vi.fn() as any)
})

afterEach(() => {
  windowOpenSpy.mockRestore()
})

describe('openVkOauthPopup', () => {
  it('вызывает window.open', () => {
    openVkOauthPopup('/main')
    expect(windowOpenSpy).toHaveBeenCalledOnce()
  })

  it('передаёт имя окна "vk-oauth"', () => {
    openVkOauthPopup('/main')
    const [, name] = windowOpenSpy.mock.calls[0]!
    expect(name).toBe('vk-oauth')
  })

  it('включает returnTo в URL (закодированным)', () => {
    openVkOauthPopup('/contacts/c1')
    const [url] = windowOpenSpy.mock.calls[0]!
    expect(String(url)).toContain(`returnTo=${encodeURIComponent('/contacts/c1')}`)
  })

  it('включает origin в URL', () => {
    openVkOauthPopup('/main')
    const [url] = windowOpenSpy.mock.calls[0]!
    expect(String(url)).toContain(encodeURIComponent(window.location.origin))
  })

  it('включает параметр popup=1 в URL', () => {
    openVkOauthPopup('/main')
    const [url] = windowOpenSpy.mock.calls[0]!
    expect(String(url)).toContain('popup=1')
  })

  it('передаёт строку с размерами окна третьим аргументом', () => {
    openVkOauthPopup('/main')
    const [, , features] = windowOpenSpy.mock.calls[0]!
    expect(String(features)).toContain('width=500')
    expect(String(features)).toContain('height=650')
  })
})
