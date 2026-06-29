import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import { decrypt } from '../../common/utils/encrypt'
import type { TUserPublic, TUserRole } from '../../common/types/user.types'

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async getAllUsers(): Promise<TUserPublic[]> {
    const rows = await this.db.db.select().from(schema.users)
    return rows.map(({ password: _, refresh_token: __, vk_access_token, vk_refresh_token, vk_token_expires_at, vk_user_id, telegram_session, ...user }) => ({
      ...user,
      ai_system_prompt:   decrypt(user.ai_system_prompt),
      vk_connected:       vk_access_token !== null,
      telegram_connected: telegram_session !== null,
    }))
  }

  async createUser(name: string, login: string, password: string, role: TUserRole = 'user'): Promise<TUserPublic> {
    const existing = await this.db.db.select({ id: schema.users.id })
      .from(schema.users).where(eq(schema.users.login, login))

    if (existing[0]) throw new BadRequestException('Пользователь с таким логином уже существует')

    const id   = crypto.randomUUID()
    const hash = await bcrypt.hash(password, 12)

    await this.db.db.insert(schema.users).values({ id, login, password: hash, name: name.trim(), role })

    const rows = await this.db.db.select().from(schema.users).where(eq(schema.users.id, id))
    const { password: _, refresh_token: __, vk_access_token, vk_refresh_token, vk_token_expires_at, vk_user_id, telegram_session, ...user } = rows[0]!
    return {
      ...user,
      vk_connected:       vk_access_token !== null,
      telegram_connected: telegram_session !== null,
    }
  }

  async deleteUser(adminId: string, userId: string): Promise<void> {
    if (adminId === userId) throw new BadRequestException('Нельзя удалить собственный аккаунт')

    const existing = await this.db.db.select({ id: schema.users.id })
      .from(schema.users).where(eq(schema.users.id, userId))

    if (!existing[0]) throw new NotFoundException('Пользователь не найден')

    await this.db.db.transaction(async (tx) => {
      await tx.delete(schema.tasks).where(eq(schema.tasks.user_id, userId))
      await tx.delete(schema.contacts).where(eq(schema.contacts.user_id, userId))
      await tx.delete(schema.users).where(eq(schema.users.id, userId))
    })
  }
}
