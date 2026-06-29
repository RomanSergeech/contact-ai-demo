import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { TTokenPayload } from '../../modules/auth/auth.types'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TTokenPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: TTokenPayload }>()
    return request.user
  },
)
