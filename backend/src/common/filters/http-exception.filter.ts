import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter')

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx    = host.switchToHttp()
    const res    = ctx.getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body   = exception.getResponse()

      const message = typeof body === 'string'
        ? body
        : (body as { message?: string | string[] }).message

      const errors = Array.isArray(message) ? message : []
      const text   = Array.isArray(message) ? message[0] ?? 'Ошибка' : (message ?? 'Ошибка')

      res.status(status).json({ message: text, errors })
      return
    }

    this.logger.error('Необработанное исключение', exception instanceof Error ? exception.stack : exception)

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Внутренняя ошибка сервера',
      errors:  [],
    })
  }
}
