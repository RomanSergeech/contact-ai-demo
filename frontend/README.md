# Frontend - Contact AI

Next.js 16 + React 19 + TypeScript + Zustand + SCSS Modules. Архитектура Feature-Sliced Design (FSD).

---

## Архитектура (FSD)

```
src/
├── app/           Next.js App Router - только роутинг, никакой логики
│   ├── (auth)/    Публичные маршруты (логин)
│   └── (private)/ Защищённые маршруты - layout проверяет авторизацию и редиректит
├── widgets/       Самодостаточные UI-блоки со своим состоянием
│   ├── ai-chat/              AI-чат с историей и стримингом ответа
│   ├── header/               Шапка с навигацией
│   ├── table/                Таблица с сортировкой и пагинацией
│   ├── telegram-login-modal/ Пошаговый MTProto-логин (номер/QR)
│   └── vk-oauth-modal/       VK OAuth flow
├── components/    Компоненты уровня страниц (один на страницу)
│   ├── contact/   Карточка контакта, AI-обогащение, логи скрапинга
│   ├── main/      Список контактов, доска задач с drag-and-drop
│   ├── settings/  Настройки профиля, подключение соцсетей
│   └── admin/     Управление пользователями
└── shared/
    ├── api/       Доменные сервисы: auth, settings, admin, contacts, tasks, ai
    ├── store/     Zustand-сторы по доменам
    ├── hooks/     Кастомные React-хуки
    ├── types/     TypeScript-типы, типы API-ответов (api.types.ts)
    ├── utils/     Чистые утилиты (один файл - одна функция)
    ├── config/    Axios-инстанс, конфигурация маршрутов
    └── UI/        Переиспользуемые примитивы: Button, Input, Modal, Select, Table и др.
```

---

## API-слой

Все запросы к API идут через доменные сервисы в `shared/api/` - прямые вызовы axios в компонентах запрещены. Axios-инстанс настроен с `withCredentials: true`; токены в httpOnly cookies - ручная подстановка не нужна.

Response interceptor конвертирует `AxiosError` в plain `Error` с текстом из `response.data.message`.

```
shared/api/
├── auth/auth.service.ts          login, checkAuth, logout
├── settings/settings.service.ts  профиль, AI-промпт, Telegram/VK подключение
├── admin/admin.service.ts        управление пользователями
├── contacts/contacts.service.ts  CRUD, фото, экспорт, логи скрапинга
├── tasks/tasks.service.ts        CRUD задач
└── ai/ai.service.ts              чат, голосовой ввод, обогащение, скрапинг
```

Тип каждого ответа объявлен в `shared/types/api.types.ts` и подставляется дженериком: `$api.get<TGetAllContactsResponse>('/contacts')`.

---

## State Management

Zustand-сторы по доменам в `shared/store/`:
- `useAuthStore` - isAuth, loading, login / logout / checkAuth
- `useUserStore` - профиль пользователя
- `useContactsStore` - массив контактов
- `useTasksStore` - массив задач
- `useAlertStore` - глобальный алерт

Паттерн действия: API-вызов внутри экшена стора, обёрнутый в `tryCatch` из `shared/utils`. Компоненты вызывают только экшены, не `ApiService` напрямую.

---

## Тесты

**Unit-тесты (Vitest + React Testing Library + MSW) - ~80% покрытие:**
- Моки сервисов через `shared/tests/__mocks__/`
- Фабрики тестовых данных в `shared/tests/factories.ts`
- MSW handlers для перехвата HTTP-запросов

**E2E-тесты (Playwright) - 60+ тестов:**
- `e2e/auth.spec.ts` - авторизация
- `e2e/contacts.spec.ts` - список и CRUD контактов
- `e2e/contact-detail.spec.ts` - карточка контакта
- `e2e/ai-chat.spec.ts` - AI-чат
- `e2e/tasks.spec.ts` - задачи
- `e2e/settings.spec.ts` - настройки
- `e2e/admin.spec.ts` - панель администратора

Прогон E2E-тестов - обязательное условие деплоя в CI/CD.

---

## Безопасность

HTTP Security Headers в `next.config.ts`:
- `Strict-Transport-Security` (HSTS)
- `X-XSS-Protection`
- `X-Frame-Options: DENY` (защита от clickjacking)
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff` (защита от MIME-sniffing)
