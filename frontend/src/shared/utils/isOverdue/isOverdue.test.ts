import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOverdue } from './isOverdue'

const TODAY = new Date('2024-06-15T12:00:00.000Z')

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(TODAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for today (not overdue)', () => {
    expect(isOverdue('2024-06-15')).toBe(false)
  })

  it('returns true for yesterday (overdue)', () => {
    expect(isOverdue('2024-06-14')).toBe(true)
  })

  it('returns false for tomorrow (not overdue)', () => {
    expect(isOverdue('2024-06-16')).toBe(false)
  })

  it('returns true for a date far in the past', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('returns false for a date far in the future', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})
