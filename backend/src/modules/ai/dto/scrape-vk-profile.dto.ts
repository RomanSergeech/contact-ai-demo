import { IsString, MinLength, MaxLength } from 'class-validator'

export class ScrapeVkProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  contactId!: string
}
