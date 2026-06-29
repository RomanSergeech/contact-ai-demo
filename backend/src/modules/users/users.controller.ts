import { Controller, Get, Post, Delete, Body, UseGuards, Req, HttpCode } from '@nestjs/common'
import { Request } from 'express'
import { UsersService } from './users.service'
import { SaveNameDto } from './dto/save-name.dto'
import { SaveAiPromptDto } from './dto/save-ai-prompt.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { writeAudit } from '../../common/utils/audit'
import { DatabaseService } from '../../database/database.service'
import type { TTokenPayload } from '../auth/auth.types'

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly db:           DatabaseService,
  ) {}

  @Get('data')
  getMe(@CurrentUser() user: TTokenPayload) {
    return this.usersService.getById(user.id)
  }

  @Post('settings/name')
  @HttpCode(200)
  saveName(@CurrentUser() user: TTokenPayload, @Body() dto: SaveNameDto) {
    return this.usersService.saveName(user.id, dto.name)
  }

  @Post('settings/save')
  @HttpCode(200)
  async saveAiPrompt(
    @CurrentUser() user: TTokenPayload,
    @Body() dto: SaveAiPromptDto,
    @Req() req: Request,
  ) {
    const result = await this.usersService.saveAiPrompt(user.id, dto.ai_system_prompt)
    writeAudit(this.db.db, user.id, 'user.save_prompt', null, req.ip ?? null)
    return result
  }

  @Post('settings/vk/disconnect')
  @HttpCode(200)
  async disconnectVk(@CurrentUser() user: TTokenPayload, @Req() req: Request) {
    const result = await this.usersService.disconnectVk(user.id)
    writeAudit(this.db.db, user.id, 'user.disconnect_vk', null, req.ip ?? null)
    return result
  }

  @Post('settings/telegram/disconnect')
  @HttpCode(200)
  async disconnectTelegram(@CurrentUser() user: TTokenPayload, @Req() req: Request) {
    const result = await this.usersService.disconnectTelegram(user.id)
    writeAudit(this.db.db, user.id, 'user.disconnect_telegram', null, req.ip ?? null)
    return result
  }

  @Delete('delete')
  @HttpCode(200)
  async deleteAccount(@CurrentUser() user: TTokenPayload, @Req() req: Request) {
    writeAudit(this.db.db, user.id, 'user.delete_account', null, req.ip ?? null)
    await this.usersService.deleteAccount(user.id)
    return { message: 'OK' }
  }
}
