import { IsString, MinLength } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class LoginDto {
  @Trim()
  @IsString()
  @MinLength(1, { message: 'Введите логин' })
  login!: string

  @IsString()
  @MinLength(1, { message: 'Введите пароль' })
  password!: string
}
