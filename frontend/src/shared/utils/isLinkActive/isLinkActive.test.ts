import { describe, it, expect } from 'vitest'
import { isLinkActive } from './isLinkActive'

describe('isLinkActive', () => {
  describe('exact match', () => {
    it('returns true when pathname equals href', () => {
      expect(isLinkActive('/main', '/main')).toBe(true)
    })

    it('returns true for /tasks exact match', () => {
      expect(isLinkActive('/tasks', '/tasks')).toBe(true)
    })

    it('returns false when pathname does not match href', () => {
      expect(isLinkActive('/tasks', '/main')).toBe(false)
    })
  })

  describe('/main is exact-match only', () => {
    it('does not match sub-paths of /main', () => {
      expect(isLinkActive('/main/something', '/main')).toBe(false)
    })
  })

  describe('sub-path matching for non-/main hrefs', () => {
    it('returns true when pathname starts with href', () => {
      expect(isLinkActive('/tasks/123', '/tasks')).toBe(true)
    })

    it('returns true for /settings/profile under /settings', () => {
      expect(isLinkActive('/settings/profile', '/settings')).toBe(true)
    })

    it('returns false when only a prefix of the segment matches', () => {
      expect(isLinkActive('/task', '/tasks')).toBe(false)
    })

    it('returns false when pathname is shorter than href', () => {
      expect(isLinkActive('/tasks', '/tasks/123')).toBe(false)
    })
  })
})
