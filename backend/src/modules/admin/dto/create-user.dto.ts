import { IsString, IsEmail, MinLength, MaxLength, IsIn, IsOptional } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'
import type { TUserRole } from '../../../common/types/user.types'

export class CreateUserDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Введите имя' })
  @MaxLength(255)
  name!: string

  @Trim()
  @IsEmail({}, { message: 'Некорректный email' })
  @MaxLength(255)
  login!: string

  @IsString()
  @MinLength(6, { message: 'Минимум 6 символов' })
  @MaxLength(72)
  password!: string

  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: TUserRole
}
