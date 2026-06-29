import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins multiple string classes', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('returns a single class unchanged', () => {
    expect(cn('only')).toBe('only')
  })

  it('returns empty string with no arguments', () => {
    expect(cn()).toBe('')
  })

  it('filters out undefined values', () => {
    expect(cn('a', undefined, 'b')).toBe('a b')
  })

  it('filters out false values', () => {
    expect(cn('a', false, 'b')).toBe('a b')
  })

  it('filters out empty strings', () => {
    expect(cn('a', '', 'b')).toBe('a b')
  })

  it('handles all-falsy arguments', () => {
    expect(cn(undefined, false, '')).toBe('')
  })

  it('supports conditional class pattern', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active')
  })
})
