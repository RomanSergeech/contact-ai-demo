import { IsString, MinLength, MaxLength } from 'class-validator'

export class ScrapeTelegramProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  contactId!: string
}
