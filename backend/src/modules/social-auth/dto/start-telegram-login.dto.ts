import { IsString, Matches } from 'class-validator'
import { Trim } from '../../../common/decorators/trim.decorator'

export class StartTelegramLoginDto {
  @Trim()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Введите номер телефона в международном формате' })
  phone!: string
}
