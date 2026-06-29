import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { ContactsModule } from './modules/contacts/contacts.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { AiModule } from './modules/ai/ai.module'
import { AdminModule } from './modules/admin/admin.module'
import { SocialAuthModule } from './modules/social-auth/social-auth.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ContactsModule,
    TasksModule,
    AiModule,
    AdminModule,
    SocialAuthModule,
  ],
})
export class AppModule {}
