import { IsIn, IsString, IsNotEmpty } from 'class-validator'

export class ResolveLogDto {
  @IsString()
  @IsNotEmpty()
  field!: string

  @IsIn(['old', 'new', 'merge'])
  choice!: 'old' | 'new' | 'merge'
}
