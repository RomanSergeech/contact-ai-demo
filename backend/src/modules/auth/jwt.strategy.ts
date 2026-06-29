import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { Request } from 'express'
import { DatabaseService } from '../../database/database.service'
import * as schema from '../../database/schema'
import type { TTokenPayload } from './auth.types'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies?.['accessToken'] as string | undefined) ?? null,
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    })
  }

  async validate(payload: TTokenPayload): Promise<TTokenPayload> {
    const rows = await this.db.db.select({ role: schema.users.role, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, payload.id))

    const user = rows[0]
    if (!user) throw new UnauthorizedException('Пользователь не найден')

    return { ...payload, role: user.role, name: user.name }
  }
}
