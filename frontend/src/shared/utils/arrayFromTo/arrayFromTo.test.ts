import { describe, it, expect } from 'vitest'
import { arrayFromTo } from './arrayFromTo'

describe('arrayFromTo', () => {
  describe('normal ranges', () => {
    it('returns range from 1 to 5', () => {
      expect(arrayFromTo(1, 5)).toEqual([1, 2, 3, 4, 5])
    })

    it('returns range from 3 to 7', () => {
      expect(arrayFromTo(3, 7)).toEqual([3, 4, 5, 6, 7])
    })

    it('returns single-element array when from equals to', () => {
      expect(arrayFromTo(4, 4)).toEqual([4])
    })

    it('returns range starting from 2', () => {
      expect(arrayFromTo(2, 5)).toEqual([2, 3, 4, 5])
    })
  })

  describe('from = 0 (special branch)', () => {
    it('returns [0..to] inclusive when from is 0', () => {
      expect(arrayFromTo(0, 3)).toEqual([0, 1, 2, 3])
    })

    it('returns [0] when from=0 and to=0', () => {
      expect(arrayFromTo(0, 0)).toEqual([0])
    })

    it('returns [0..9] for months range', () => {
      expect(arrayFromTo(0, 9)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
  })

  describe('edge cases — empty results', () => {
    it('returns [] when from is negative', () => {
      expect(arrayFromTo(-1, 5)).toEqual([])
    })

    it('returns [] when to is negative', () => {
      expect(arrayFromTo(1, -1)).toEqual([])
    })

    it('returns [] when both are negative', () => {
      expect(arrayFromTo(-3, -1)).toEqual([])
    })

    it('returns [] when from > to (slice goes past end)', () => {
      expect(arrayFromTo(5, 3)).toEqual([])
    })
  })
})
