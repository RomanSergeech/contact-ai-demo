import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // Тесты юнит-уровня: чистые функции и сервисы с замоканным DatabaseService —
    // реальная БД/сеть не поднимается.
  },
})
