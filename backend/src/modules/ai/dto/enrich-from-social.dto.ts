import { IsIn, IsString, MinLength, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class EnrichFromSocialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  contactId!: string

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  url!: string

  @IsIn(['telegram', 'vk'])
  platform!: 'telegram' | 'vk'
}
