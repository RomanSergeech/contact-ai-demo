import { IsString, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class SaveAiPromptDto {
  @Trim()
  @IsString()
  @MaxLength(4000)
  ai_system_prompt!: string
}
