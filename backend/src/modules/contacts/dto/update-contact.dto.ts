import { IsString, IsOptional, IsIn, MaxLength, IsArray, ArrayMaxSize, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { Trim } from '../../../common/decorators/trim.decorator'
import type { TContactPriority, TContactRelationLevel, TImportantDate, TContactInfo } from '../../../common/types/contact.types'

class ImportantDateDto implements TImportantDate {
  @Trim()
  @IsString()
  @MaxLength(255)
  label!: string

  @IsString()
  @MaxLength(20)
  date!: string
}

class ContactInfoDto implements TContactInfo {
  @Trim()
  @IsString()
  @MaxLength(255)
  phone!: string

  @Trim()
  @IsString()
  @MaxLength(255)
  email!: string

  @Trim()
  @IsString()
  @MaxLength(255)
  telegram_profile!: string

  @Trim()
  @IsString()
  @MaxLength(255)
  telegram_group!: string

  @Trim()
  @IsString()
  @MaxLength(255)
  whatsapp!: string

  @Trim()
  @IsString()
  @MaxLength(255)
  instagram!: string

  @Trim()
  @IsString()
  @MaxLength(255)
  vk_profile!: string

  @Trim()
  @IsString()
  @MaxLength(255)
  vk_group!: string

  @Trim()
  @IsString()
  @MaxLength(512)
  personal_site!: string

  @Trim()
  @IsString()
  @MaxLength(512)
  company_site!: string
}

export class UpdateContactDto {
  @IsString()
  id!: string

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  full_name?: string

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  position?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  company?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  direction?: string | null

  @IsOptional()
  @IsIn(['high', 'medium', 'low'])
  priority?: TContactPriority

  @IsOptional()
  @IsIn(['cold', 'warm', 'middle'])
  relationship_level?: TContactRelationLevel

  @IsOptional()
  @IsString()
  @MaxLength(20)
  last_contact?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(20)
  birth_date?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  goals?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  main_pain?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  interests?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  dream?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  personal_traits?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  useful_to_me?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  useful_to_them?: string | null

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contact_info?: TContactInfo | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  note?: string | null

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ImportantDateDto)
  important_dates?: TImportantDate[]

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  recent_activity_summary?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  recent_topics?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  conversation_starters?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  tg_activity_summary?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  tg_recent_topics?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  tg_conversation_starters?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  company_about?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  company_size?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(20)
  company_founded?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  company_target_audience?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  company_market?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  company_technologies?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  company_revenue?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  company_competitors?: string | null

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  company_requisites?: string | null
}
