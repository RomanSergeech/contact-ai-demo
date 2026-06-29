import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, RequestMethod } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import * as morgan from 'morgan'
import { join } from 'path'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  const isProduction = process.env['NODE_ENV'] === 'production'

  app.set('trust proxy', 1)

  app.use(helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc:    ["'none'"],
            imgSrc:        ["'self'"],
            styleSrc:      ["'self'", "'unsafe-inline'"],
            objectSrc:     ["'none'"],
            frameAncestors: ["'none'"],
            baseUri:       ["'none'"],
          },
        }
      : false,
    hsts: isProduction ? undefined : false,
  }))

  if (isProduction) {
    app.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        next()
        return
      }
      res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)
    })
  }

  // Изображения контактов грузятся с другого origin (фронт на 5173, бэк на 5000)
  app.use('/uploads', (_req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
  })

  app.use(morgan(isProduction ? 'combined' : 'dev'))

  app.use(cookieParser())

  const allowedOrigins = (process.env['CLIENT_URL'] ?? 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .filter(origin => !isProduction || origin.startsWith('https://'))

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  app.use(
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, message: { message: 'Слишком много запросов, попробуйте позже' } }),
  )

  app.use(
    '/api/auth/login',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { message: 'Слишком много попыток входа, попробуйте позже' } }),
  )

  app.use(
    '/api/auth/refresh',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { message: 'Слишком много попыток, попробуйте позже' } }),
  )

  app.use(
    '/api/ai',
    rateLimit({ windowMs: 60 * 1000, limit: 20, message: { message: 'Слишком много запросов к ИИ, попробуйте позже' } }),
  )

  app.use(
    '/api/admin',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, message: { message: 'Слишком много запросов, попробуйте позже' } }),
  )

  app.use(
    '/api/contact/photo',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { message: 'Слишком много загрузок, попробуйте позже' } }),
  )

  app.use(
    '/api/user/settings/telegram/start',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, message: { message: 'Слишком много попыток, попробуйте позже' } }),
  )

  app.use(
    '/api/user/settings/telegram/qr-start',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, message: { message: 'Слишком много попыток, попробуйте позже' } }),
  )

  app.useStaticAssets(join(process.cwd(), 'public'))

  // Фото контактов отдаётся не открытой статикой, а через защищённый GET /uploads/:filename
  // (JwtAuthGuard + проверка владельца). Маршрут исключён из глобального префикса /api,
  // чтобы сохранить ранее сохранённые в БД ссылки вида /uploads/<file>.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'uploads/:filename', method: RequestMethod.GET }],
  })

  app.useGlobalPipes(new ValidationPipe({
    whitelist:        true,
    forbidNonWhitelisted: true,
    transform:        true,
  }))

  app.useGlobalFilters(new AllExceptionsFilter())

  const port = process.env['PORT'] ?? 5000
  await app.listen(port)
  console.log(`Started on PORT = ${port}`)
}

bootstrap()
