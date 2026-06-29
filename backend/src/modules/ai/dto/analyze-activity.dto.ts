import { IsString, IsIn, MinLength, MaxLength } from 'class-validator'

export class AnalyzeActivityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  contactId!: string

  @IsIn(['profile', 'group'])
  source!: 'profile' | 'group'
}
