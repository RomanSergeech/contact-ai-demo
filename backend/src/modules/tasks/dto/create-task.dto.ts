import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'
import type { TTaskStatus, TTaskPriority } from '../../../common/types/task.types'

export class CreateTaskDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Введите название задачи' })
  @MaxLength(255)
  title!: string

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
