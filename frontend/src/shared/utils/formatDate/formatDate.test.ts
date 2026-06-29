import { describe, it, expect } from 'vitest'
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('returns a non-empty string', () => {
    expect(formatDate('2024-06-15')).toBeTruthy()
  })

  it('includes the numeric day', () => {
    expect(formatDate('2024-06-15')).toContain('15')
  })

  it('formats to Russian short month', () => {
    expect(formatDate('2024-06-15')).toBe('15 июн.')
  })

  it('formats January correctly', () => {
    expect(formatDate('2024-01-05')).toBe('5 янв.')
  })

  it('formats December correctly', () => {
    expect(formatDate('2024-12-31')).toBe('31 дек.')
  })
})
