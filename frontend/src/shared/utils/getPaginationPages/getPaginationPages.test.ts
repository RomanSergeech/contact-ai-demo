import { describe, it, expect } from 'vitest'
import { getPaginationPages } from './getPaginationPages'

describe('getPaginationPages', () => {
  describe('5 pages or fewer — shows all pages', () => {
    it('returns [1] for 1 page', () => {
      expect(getPaginationPages(1, 1)).toEqual([1])
    })

    it('returns all pages for exactly 5 pages', () => {
      expect(getPaginationPages(3, 5)).toEqual([1, 2, 3, 4, 5])
    })

    it('returns all pages for 4 pages', () => {
      expect(getPaginationPages(2, 4)).toEqual([1, 2, 3, 4])
    })
  })

  describe('more than 5 pages — applies ellipsis logic', () => {
    it('page 1: shows first 2 pages, ellipsis, last page', () => {
      expect(getPaginationPages(1, 10)).toEqual([1, 2, 'ellipsis', 10])
    })

    it('page 10 (last): shows first page, ellipsis, last 2 pages', () => {
      expect(getPaginationPages(10, 10)).toEqual([1, 'ellipsis', 9, 10])
    })

    it('page 5 of 10: shows 1, ellipsis, 4–6, ellipsis, 10', () => {
      expect(getPaginationPages(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
    })

    it('page 2: no left ellipsis (neighbors span to page 1)', () => {
      expect(getPaginationPages(2, 10)).toEqual([1, 2, 3, 'ellipsis', 10])
    })

    it('page 9 of 10: no right ellipsis', () => {
      expect(getPaginationPages(9, 10)).toEqual([1, 'ellipsis', 8, 9, 10])
    })

    it('page 3 of 10: shows 1–4, ellipsis, 10', () => {
      expect(getPaginationPages(3, 10)).toEqual([1, 2, 3, 4, 'ellipsis', 10])
    })

    it('page 1 of 6: shows 1–2, ellipsis, 6', () => {
      expect(getPaginationPages(1, 6)).toEqual([1, 2, 'ellipsis', 6])
    })

    it('page 4 of 6: shows 1, ellipsis, 3–6', () => {
      expect(getPaginationPages(4, 6)).toEqual([1, 'ellipsis', 3, 4, 5, 6])
    })
  })

  describe('always includes first and last page', () => {
    it('page 1 always present', () => {
      const pages = getPaginationPages(7, 20)
      expect(pages[0]).toBe(1)
    })

    it('last page always present', () => {
      const pages = getPaginationPages(7, 20)
      expect(pages[pages.length - 1]).toBe(20)
    })
  })
})
