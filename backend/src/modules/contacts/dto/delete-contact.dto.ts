import { IsArray, IsString, ArrayNotEmpty } from 'class-validator'

export class DeleteContactDto {
  @IsString()
  id!: string
}

export class DeleteContactsBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[]
}
