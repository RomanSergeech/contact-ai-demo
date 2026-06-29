import { IsString, MinLength, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class ContactFromVoiceDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string
}
