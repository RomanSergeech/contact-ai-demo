import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'
import type { TTaskStatus, TTaskPriority } from '../../../common/types/task.types'

export class UpdateTaskDto {
  @IsString()
  id!: string

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(4000)
  description?: string

  @IsOptional()
  @IsIn(['overdue', 'today', 'this_week', 'no_deadline', 'done'])
  status?: TTaskStatus

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: TTaskPriority

  @IsOptional()
  @IsString()
  contact_id?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(20)
  deadline?: string | null
}
