import { IsString, MinLength, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class ChatDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string
}
