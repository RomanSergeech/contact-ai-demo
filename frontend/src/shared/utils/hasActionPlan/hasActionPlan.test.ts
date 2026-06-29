import { describe, it, expect } from 'vitest'
import { hasActionPlan } from './hasActionPlan'

describe('hasActionPlan', () => {
  describe('detects numbered lists', () => {
    it('detects "1. item" format', () => {
      expect(hasActionPlan('1. Do something')).toBe(true)
    })

    it('detects "1) item" format', () => {
      expect(hasActionPlan('1) Do something')).toBe(true)
    })

    it('detects multi-digit numbers like "10. item"', () => {
      expect(hasActionPlan('10. Tenth step')).toBe(true)
    })

    it('detects a list embedded in multiline text', () => {
      expect(hasActionPlan('Here is the plan:\n1. Step one\n2. Step two')).toBe(true)
    })

    it('detects a list with leading whitespace on the line', () => {
      expect(hasActionPlan('  2. Item with indent')).toBe(true)
    })
  })

  describe('returns false for non-list text', () => {
    it('returns false for plain text', () => {
      expect(hasActionPlan('No list here')).toBe(false)
    })

    it('returns false when there is no space after the separator', () => {
      expect(hasActionPlan('1.NoSpace')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(hasActionPlan('')).toBe(false)
    })

    it('returns false for a standalone number without separator', () => {
      expect(hasActionPlan('1 item')).toBe(false)
    })

    it('returns false when the line after the number is empty', () => {
      expect(hasActionPlan('1.  ')).toBe(false)
    })
  })
})
