import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'
import { SocialProfileService } from './social-profile.service'
import { ContactsModule } from '../contacts/contacts.module'
import { SocialAuthModule } from '../social-auth/social-auth.module'

@Module({
  imports:     [ContactsModule, SocialAuthModule],
  controllers: [AiController],
  providers:   [AiService, SocialProfileService],
})
export class AiModule {}
