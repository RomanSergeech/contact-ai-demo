import { IsString, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class TelegramCodeDto {
  @Trim()
  @IsString()
  @MaxLength(10)
  code!: string
}
