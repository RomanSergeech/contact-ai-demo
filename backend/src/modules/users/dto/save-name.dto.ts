import { IsString, MinLength, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class SaveNameDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Введите имя' })
  @MaxLength(255)
  name!: string
}
