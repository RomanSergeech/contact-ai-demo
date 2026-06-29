import {
  Controller, Post, Body, Req, Res, UseGuards, HttpCode,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { writeAudit } from '../../common/utils/audit'
import { DatabaseService } from '../../database/database.service'
import type { TTokenPayload } from './auth.types'

const isProduction = process.env['NODE_ENV'] === 'production'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   isProduction,
  maxAge:   30 * 24 * 60 * 60 * 1000,
  sameSite: 'strict' as const,
}

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   isProduction,
  maxAge:   2 * 24 * 60 * 60 * 1000,
  sameSite: 'strict' as const,
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly db:          DatabaseService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.login(dto.login, dto.password)
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)
    res.cookie('accessToken',  result.accessToken,  ACCESS_COOKIE_OPTIONS)
    writeAudit(this.db.db, result.user.id, 'auth.login', null, req.ip ?? null)
    return { user: result.user }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'] as string | undefined
    const result = await this.authService.refresh(refreshToken)
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)
    res.cookie('accessToken',  result.accessToken,  ACCESS_COOKIE_OPTIONS)
    return { user: result.user }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(
    @CurrentUser() user: TTokenPayload,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    await this.authService.logout(user.login)
    res.clearCookie('refreshToken')
    res.clearCookie('accessToken')
    writeAudit(this.db.db, user.id, 'auth.logout', null, req.ip ?? null)
    return { message: 'OK' }
  }
}
