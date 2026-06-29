import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { TelegramAuthService } from './telegram-auth.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { StartTelegramLoginDto } from './dto/start-telegram-login.dto'
import { TelegramCodeDto } from './dto/telegram-code.dto'
import { TelegramPasswordDto } from './dto/telegram-password.dto'
import type { TTokenPayload } from '../auth/auth.types'

@UseGuards(JwtAuthGuard)
@Controller('user/settings/telegram')
export class TelegramAuthController {
  constructor(private readonly telegramAuthService: TelegramAuthService) {}

  @Post('start')
  start(@CurrentUser() user: TTokenPayload, @Body() dto: StartTelegramLoginDto) {
    return this.telegramAuthService.startLogin(user.id, dto.phone)
  }

  @Post('code')
  code(@CurrentUser() user: TTokenPayload, @Body() dto: TelegramCodeDto) {
    return this.telegramAuthService.submitCode(user.id, dto.code)
  }

  @Post('password')
  password(@CurrentUser() user: TTokenPayload, @Body() dto: TelegramPasswordDto) {
    return this.telegramAuthService.submitPassword(user.id, dto.password)
  }

  @Post('cancel')
  async cancel(@CurrentUser() user: TTokenPayload) {
    await this.telegramAuthService.cancelLogin(user.id)
    return { ok: true }
  }

  @Post('qr-start')
  qrStart(@CurrentUser() user: TTokenPayload) {
    return this.telegramAuthService.startQrLogin(user.id)
  }

  @Post('qr-poll')
  qrPoll(@CurrentUser() user: TTokenPayload) {
    return this.telegramAuthService.pollQrLogin(user.id)
  }
}
