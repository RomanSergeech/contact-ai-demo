import { Controller, Get, Post, Body, Param, UseGuards, HttpCode } from '@nestjs/common'
import { AiService } from './ai.service'
import { ChatDto } from './dto/chat.dto'
import { TaskMetaDto } from './dto/task-meta.dto'
import { ContactFromVoiceDto } from './dto/contact-from-voice.dto'
import { EnrichFromSocialDto } from './dto/enrich-from-social.dto'
import { AnalyzeActivityDto } from './dto/analyze-activity.dto'
import { ScrapeVkProfileDto } from './dto/scrape-vk-profile.dto'
import { ScrapeTelegramProfileDto } from './dto/scrape-telegram-profile.dto'
import { EnrichTelegramGroupDto } from './dto/enrich-telegram-group.dto'
import { ScrapeWebsiteDto } from './dto/scrape-website.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { TTokenPayload } from '../auth/auth.types'

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('history/:contactId')
  getHistory(@CurrentUser() user: TTokenPayload, @Param('contactId') contactId: string) {
    return this.aiService.getHistory(user.id, contactId)
  }

  @Post('clear/:contactId')
  @HttpCode(200)
  async clearHistory(@CurrentUser() user: TTokenPayload, @Param('contactId') contactId: string) {
    await this.aiService.clearHistory(user.id, contactId)
    return { message: 'OK' }
  }

  @Post('task-meta')
  @HttpCode(200)
  generateTaskMeta(@CurrentUser() user: TTokenPayload, @Body() dto: TaskMetaDto) {
    return this.aiService.generateTaskMeta(user.id, dto.description)
  }

  @Post('contact-from-voice')
  @HttpCode(200)
  parseContactFromVoice(@Body() dto: ContactFromVoiceDto) {
    return this.aiService.parseContactFromVoice(dto.text)
  }

  @Post('enrich-from-social')
  @HttpCode(200)
  enrichFromSocial(@CurrentUser() user: TTokenPayload, @Body() dto: EnrichFromSocialDto) {
    return this.aiService.enrichFromSocial(user.id, dto.contactId, dto.url, dto.platform)
  }

  @Post('analyze-activity')
  @HttpCode(200)
  analyzeActivity(@CurrentUser() user: TTokenPayload, @Body() dto: AnalyzeActivityDto) {
    return this.aiService.analyzeRecentActivity(user.id, dto.contactId, dto.source)
  }

  @Post('scrape-vk-profile')
  @HttpCode(200)
  scrapeVkProfile(@CurrentUser() user: TTokenPayload, @Body() dto: ScrapeVkProfileDto) {
    return this.aiService.scrapeVkProfile(user.id, dto.contactId)
  }

  @Post('scrape-telegram-profile')
  @HttpCode(200)
  scrapeTelegramProfile(@CurrentUser() user: TTokenPayload, @Body() dto: ScrapeTelegramProfileDto) {
    return this.aiService.scrapeTelegramProfile(user.id, dto.contactId)
  }

  @Post('enrich-telegram-group')
  @HttpCode(200)
  enrichTelegramGroup(@CurrentUser() user: TTokenPayload, @Body() dto: EnrichTelegramGroupDto) {
    return this.aiService.enrichTelegramGroup(user.id, dto.contactId)
  }

  @Post('scrape-website')
  @HttpCode(200)
  scrapeWebsite(@CurrentUser() user: TTokenPayload, @Body() dto: ScrapeWebsiteDto) {
    return this.aiService.scrapeWebsite(user.id, dto.contactId, dto.field)
  }

  @Post(':contactId')
  @HttpCode(200)
  async chat(
    @CurrentUser() user: TTokenPayload,
    @Param('contactId') contactId: string,
    @Body() dto: ChatDto,
  ) {
    const text = await this.aiService.chat(user.id, contactId, dto.message)
    return { text }
  }
}
