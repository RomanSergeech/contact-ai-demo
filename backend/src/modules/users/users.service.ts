import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { encrypt, decrypt } from '../../common/utils/encrypt'
import type { TUserPublic } from '../../common/types/user.types'

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getById(id: string): Promise<TUserPublic> {
    const rows = await this.db.db.select().from(schema.users).where(eq(schema.users.id, id))
    if (!rows[0]) throw new NotFoundException('Пользователь не найден')
    const { password: _, refresh_token: __, vk_access_token, vk_refresh_token, vk_token_expires_at, vk_user_id, telegram_session, ...user } = rows[0]
    return {
      ...user,
      ai_system_prompt:   decrypt(user.ai_system_prompt),
      vk_connected:       vk_access_token !== null,
      telegram_connected: telegram_session !== null,
    }
  }

  async saveName(userId: string, name: string): Promise<TUserPublic> {
    const trimmed = name.trim()
    if (!trimmed) throw new BadRequestException('Имя не может быть пустым')
    await this.db.db.update(schema.users).set({ name: trimmed }).where(eq(schema.users.id, userId))
    return this.getById(userId)
  }

  async saveAiPrompt(userId: string, prompt: string): Promise<TUserPublic> {
    await this.db.db.update(schema.users).set({ ai_system_prompt: encrypt(prompt) }).where(eq(schema.users.id, userId))
    return this.getById(userId)
  }

  async disconnectVk(userId: string): Promise<TUserPublic> {
    await this.db.db.update(schema.users).set({
      vk_access_token:     null,
      vk_refresh_token:    null,
      vk_token_expires_at: null,
      vk_user_id:          null,
    }).where(eq(schema.users.id, userId))
    return this.getById(userId)
  }

  async disconnectTelegram(userId: string): Promise<TUserPublic> {
    await this.db.db.update(schema.users).set({ telegram_session: null }).where(eq(schema.users.id, userId))
    return this.getById(userId)
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.db.db.transaction(async (tx) => {
      await tx.delete(schema.tasks).where(eq(schema.tasks.user_id, userId))
      await tx.delete(schema.contacts).where(eq(schema.contacts.user_id, userId))
      await tx.delete(schema.users).where(eq(schema.users.id, userId))
    })
  }
}
