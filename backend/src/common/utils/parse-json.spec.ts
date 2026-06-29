import { describe, it, expect } from 'vitest'
import { parseJson } from './parse-json'

describe('parseJson', () => {
  it('парсит валидную JSON-строку', () => {
    expect(parseJson<{ a: number }>('{"a":1}', { a: 0 })).toEqual({ a: 1 })
    expect(parseJson<number[]>('[1,2,3]', [])).toEqual([1, 2, 3])
  })

  it('возвращает fallback на невалидной строке', () => {
    expect(parseJson<number[]>('{не json', [])).toEqual([])
    expect(parseJson<Record<string, unknown>>('', { def: true })).toEqual({ def: true })
  })

  it('возвращает fallback для null и undefined', () => {
    expect(parseJson<number[]>(null, [])).toEqual([])
    expect(parseJson<number[]>(undefined, [])).toEqual([])
  })

  it('возвращает значение как есть, если это уже объект (не строка)', () => {
    const obj = { a: 1 }
    expect(parseJson(obj, {})).toBe(obj)
    const arr = [1, 2]
    expect(parseJson(arr, [])).toBe(arr)
  })

  it('строка "null" парсится в null и подменяется на fallback (?? fallback не срабатывает для JSON null)', () => {
    // JSON.parse('null') === null → возвращается именно null (без подмены),
    // т.к. ветка строки делает return JSON.parse(val) напрямую
    expect(parseJson<number[]>('null', [])).toBeNull()
  })
})
