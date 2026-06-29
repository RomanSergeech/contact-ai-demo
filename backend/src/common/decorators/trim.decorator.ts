import { Transform } from 'class-transformer'

// Обрезает пробелы по краям строки перед валидацией. Применять к строковым полям DTO.
export const Trim = (): PropertyDecorator => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
