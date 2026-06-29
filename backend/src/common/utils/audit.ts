import { Logger } from '@nestjs/common'
import { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../../database/schema'

const logger = new Logger('Audit')

export type TAuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'contact.create'
  | 'contact.update'
  | 'contact.delete'
  | 'contact.photo'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'user.save_prompt'
  | 'user.connect_vk'
  | 'user.disconnect_vk'
  | 'user.connect_telegram'
  | 'user.disconnect_telegram'
  | 'user.delete_account'

export const writeAudit = (
  db:       MySql2Database<typeof schema>,
  userId:   string,
  action:   TAuditAction,
  entityId: string | null = null,
  ip:       string | null = null,
): void => {
  db.insert(schema.auditLog).values({
    id:        crypto.randomUUID(),
    user_id:   userId,
    action,
    entity_id: entityId ?? undefined,
    ip:        ip ?? undefined,
  }).catch(err => logger.error(`Не удалось записать audit-лог (action=${action}, userId=${userId})`, err instanceof Error ? err.stack : err))
}
