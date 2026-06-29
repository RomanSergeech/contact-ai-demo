import { IsString, MinLength, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class TaskMetaDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string
}
