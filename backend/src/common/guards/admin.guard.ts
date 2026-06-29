import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import type { TTokenPayload } from '../../modules/auth/auth.types'

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    
    const request = ctx.switchToHttp().getRequest<{ user: TTokenPayload }>()
    
    if (request.user?.role !== 'admin') {
      throw new ForbiddenException('Доступ запрещён')
    }

    const rows = await this.db.db.select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, request.user.id))

    if (rows[0]?.role !== 'admin') {
      throw new ForbiddenException('Доступ запрещён')
    }

    return true
  }
}
