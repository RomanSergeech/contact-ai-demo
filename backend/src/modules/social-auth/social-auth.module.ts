import { Module } from '@nestjs/common'
import { VkOauthService } from './vk-oauth.service'
import { VkOauthController } from './vk-oauth.controller'
import { TelegramAuthService } from './telegram-auth.service'
import { TelegramAuthController } from './telegram-auth.controller'

@Module({
  controllers: [VkOauthController, TelegramAuthController],
  providers:   [VkOauthService, TelegramAuthService],
  exports:     [VkOauthService],
})
export class SocialAuthModule {}
