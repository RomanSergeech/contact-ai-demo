import { IsString, MinLength, MaxLength, IsIn } from 'class-validator'

export class ScrapeWebsiteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  contactId!: string

  @IsIn(['personal_site', 'company_site'])
  field!: 'personal_site' | 'company_site'
}
