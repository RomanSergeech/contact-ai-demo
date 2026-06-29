import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { plainToInstance } from 'class-transformer'
import { Trim } from './trim.decorator'

class Dto {
  @Trim()
  name!: string

  @Trim()
  optional?: unknown
}

describe('@Trim()', () => {
  it('обрезает пробелы по краям строки', () => {
    const dto = plainToInstance(Dto, { name: '  Иван  ' })
    expect(dto.name).toBe('Иван')
  })

  it('строку только из пробелов превращает в пустую', () => {
    const dto = plainToInstance(Dto, { name: '   ' })
    expect(dto.name).toBe('')
  })

  it('нестроковые значения пропускает без изменений', () => {
    const dto = plainToInstance(Dto, { name: 'x', optional: 42 })
    expect(dto.optional).toBe(42)

    const dto2 = plainToInstance(Dto, { name: 'x', optional: null })
    expect(dto2.optional).toBeNull()
  })
})
