import { IsString } from 'class-validator'

export class DeleteTaskDto {
  @IsString()
  id!: string
}
