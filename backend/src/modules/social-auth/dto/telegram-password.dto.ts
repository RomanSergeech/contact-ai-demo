import { IsString, MaxLength } from 'class-validator'

export class TelegramPasswordDto {
  @IsString()
  @MaxLength(200)
  password!: string
}
