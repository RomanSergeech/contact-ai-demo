import { Controller, Get, Query, Req, Res, UseGuards, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'
import { VkOauthService } from './vk-oauth.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { TTokenPayload } from '../auth/auth.types'

@Controller('auth/vk')
export class VkOauthController {
  private readonly logger = new Logger(VkOauthController.name)

  constructor(
    private readonly vkOauthService: VkOauthService,
    private readonly config:         ConfigService,
  ) {}

  private getAllowedOrigins(): string[] {
    const raw = this.config.get<string>('CLIENT_URL') ?? 'http://localhost:5173'
    return raw.split(',').map(origin => origin.trim()).filter(Boolean)
  }

  private resolveClientOrigin(req: Request, origin: string | undefined): string {
    const allowed = this.getAllowedOrigins()

    if (origin && allowed.includes(origin)) return origin

    const referer = req.headers.referer
    if (referer) {
      const refererOrigin = new URL(referer).origin
      if (allowed.includes(refererOrigin)) return refererOrigin
    }
    return allowed[0]!
  }

  @UseGuards(JwtAuthGuard)
  @Get('login')
  login(
    @CurrentUser() user: TTokenPayload,
    @Query('returnTo') returnTo: string | undefined,
    @Query('origin') origin: string | undefined,
    @Query('popup') popup: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const safeReturnTo = returnTo?.startsWith('/') ? returnTo : null
    const clientOrigin = this.resolveClientOrigin(req, origin)
    const url = this.vkOauthService.buildAuthorizeUrl(user.id, safeReturnTo, clientOrigin, popup === '1')
    return res.redirect(url)
  }

  @Get('callback')
  async callback(
    @Query('code')  code:  string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('device_id') deviceId: string | undefined,
    @Res() res: Response,
  ) {
    const fallbackOrigin = (state && this.vkOauthService.getPendingClientOrigin(state)) || this.getAllowedOrigins()[0]!
    const fallbackPopup  = state ? this.vkOauthService.getPendingPopup(state) : false

    if (error || !code || !state) {
      return res.redirect(fallbackPopup
        ? `${fallbackOrigin}/auth/vk/popup?status=error`
        : `${fallbackOrigin}/settings?integration=vk&status=error`)
    }

    try {
      const { returnTo, clientOrigin, popup } = await this.vkOauthService.handleCallback(code, state, deviceId)
      return res.redirect(popup
        ? `${clientOrigin}/auth/vk/popup?status=success`
        : `${clientOrigin}${returnTo ?? '/settings'}?integration=vk&status=success`)
    } catch (err) {
      this.logger.error(`VK OAuth callback failed: ${err}`)
      return res.redirect(fallbackPopup
        ? `${fallbackOrigin}/auth/vk/popup?status=error`
        : `${fallbackOrigin}/settings?integration=vk&status=error`)
    }
  }
}
