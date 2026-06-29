# Backend - Contact AI

NestJS 11 + TypeScript + MySQL + Drizzle ORM. REST API с глобальным префиксом `/api`.

---

## Архитектура

```
src/
├── main.ts                   bootstrap: helmet, CORS, rate-limit, ValidationPipe, cookieParser
├── app.module.ts             корневой модуль
├── database/
│   ├── schema.ts             Drizzle-схема: users, contacts, tasks, audit_log, contact_scraping_logs
│   └── database.service.ts  глобальный mysql2 pool + drizzle instance
├── common/
│   ├── guards/               JwtAuthGuard, AdminGuard
│   ├── decorators/           @CurrentUser(), @Trim()
│   ├── filters/              AllExceptionsFilter - единый формат ошибок { message, errors }
│   └── utils/
│       ├── encrypt.ts        AES-256-GCM шифрование, версионирование ключей
│       └── audit.ts          writeAudit() - запись в audit_log
└── modules/
    ├── auth/        login, refresh, logout - JWT в httpOnly cookie
    ├── users/       настройки профиля, AI-промпт пользователя
    ├── contacts/    CRUD, загрузка фото, экспорт, логи скрапинга
    ├── tasks/       управление задачами
    ├── ai/          чат, голосовой ввод, скрапинг, анализ активности
    ├── social-auth/ VK OAuth + Telegram MTProto логин
    └── admin/       управление пользователями (role=admin)
```

---

## Авторизация

Двухтокенная схема - оба токена в `httpOnly + Secure + SameSite=Strict` cookies, фронтенду недоступны:

- **Access token** - JWT (2 дня), проверяется через `JwtStrategy`
- **Refresh token** (30 дней) - SHA-256 хеш хранится в БД; повторное использование отозванного токена немедленно инвалидирует все токены пользователя
- `JwtStrategy` на каждый запрос сверяет пользователя и роль с БД - удалённый пользователь получает 401
- `AdminGuard` дополнительно перепроверяет `role === 'admin'` из БД для `/admin/*`

---

## База данных и миграции

Схема в `src/database/schema.ts` (Drizzle + MySQL). Запросы только через Drizzle query builder - raw SQL не используется.

Миграции в `drizzle/*.sql` + `drizzle/meta/_journal.json`:
- применяются командой `npm run db:migrate` (идемпотентно - трекаются в `__drizzle_migrations`)
- в CI/CD выполняются автоматически после `mysqldump`-бэкапа БД

---

## AI-модуль

Клиент - OpenAI SDK с поддержкой любого OpenAI-совместимого API через `OPENAI_BASE_URL`.

**Эндпоинты:**
- `POST /ai/:contactId` - чат с контекстом контакта; системный промпт + данные карточки + история чата
- `POST /ai/contact-from-voice` - структурирование карточки из голосового описания
- `POST /ai/enrich-from-social` - заполнение карточки из публичного профиля VK / Telegram
- `POST /ai/scrape-vk-profile` - обогащение + анализ активности стены VK одним запросом
- `POST /ai/scrape-telegram-profile` - обогащение из профиля Telegram
- `POST /ai/enrich-telegram-group` - извлечение данных из описания группы / канала
- `POST /ai/scrape-website` - cheerio-парсинг личного / корпоративного сайта
- `POST /ai/analyze-activity` - анализ постов VK за 7 дней, генерация `conversation_starters`
- `POST /ai/task-meta` - извлечение title, priority, deadline из описания задачи

Логика обогащения: пустые поля заполняются, конфликты с уже заполненными - логируются в `contact_scraping_logs` для ручного разрешения. Защита от prompt injection - `ANTI_INJECTION_NOTE` в каждом системном промпте.

---

## Интеграции соцсетей

**VK** - OAuth Authorization Code + PKCE (VK ID):
- Генерация PKCE-пары и state, редирект на `id.vk.com/authorize`
- Автообновление access-токена по refresh_token при истечении
- Токены зашифрованы в БД (AES-256-GCM)

**Telegram** - MTProto через gramjs:
- Логин по номеру телефона (+ 2FA) или QR-коду
- Сессия сохраняется в `users.telegram_session` (зашифрована)
- Rate limit на запросы к Telegram API: не чаще одного в 5 секунд на пользователя

---

## Безопасность

- **AES-256-GCM** шифрование чувствительных полей контакта: full_name, birth_date, goals, main_pain, interests, dream, personal_traits, contact_info, chat_history; поддержка ротации ключей через версионирование (`ENCRYPTION_KEY_VERSION`)
- **Rate limiting:** глобальный (300 req/15 мин) + отдельные лимиты на auth, AI, admin, photo upload
- **helmet** со строгим CSP в production
- **Аудит-лог:** каждая мутирующая операция - entity, action, user ID, IP
- **ValidationPipe** с `whitelist: true` и `forbidNonWhitelisted: true`
- **Gitleaks** в CI для сканирования коммитов на утечки секретов

---

## CI/CD

GitHub Actions (`/.github/workflows/deploy.yml`):

1. Gitleaks - сканирование на секреты
2. Определение изменившихся частей (frontend / backend)
3. Для backend: typecheck, npm audit, сборка, unit-тесты
4. Деплой по SSH: `mysqldump`-бэкап → `db:migrate` → `pm2 reload`

PM2-конфигурация в `ecosystem.config.cjs`.
