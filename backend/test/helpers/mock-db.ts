import { vi } from 'vitest'
import type { DatabaseService } from '../../src/database/database.service'

// Мок drizzle-инстанса (DatabaseService.db). Каждый select/insert/update/delete
// возвращает chainable-объект, который одновременно является thenable —
// поэтому `await db.select().from(x).where(y)` (и цепочки с orderBy/limit) резолвятся.
//
// Результаты select берутся из очереди в порядке вызова (queueSelect).
// insert/update/delete резолвятся в undefined, а переданные в .values()/.set()
// payload'ы складываются в captured для ассертов.

type Row = Record<string, unknown>

export interface MockDb {
  // То, что инжектится в сервис вместо DatabaseService
  service: DatabaseService
  // Сам drizzle-мок (для проверки вызовов select/insert/update/delete)
  drizzle: {
    select: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  // Захваченные payload'ы мутаций
  captured: {
    inserts: Row[]
    updates: Row[]
  }
  // Положить следующий результат select в очередь (FIFO)
  queueSelect: (rows: Row[]) => void
}

export const createMockDb = (): MockDb => {
  const selectQueue: Row[][] = []
  const captured = { inserts: [] as Row[], updates: [] as Row[] }

  const makeBuilder = (
    getResult: () => unknown,
    onSet?: (v: Row) => void,
    onValues?: (v: Row) => void,
  ) => {
    const builder: Record<string, unknown> = {
      from:    () => builder,
      where:   () => builder,
      orderBy: () => builder,
      limit:   () => builder,
      values:  (v: Row) => { onValues?.(v); return builder },
      set:     (v: Row) => { onSet?.(v); return builder },
      then:    (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
        Promise.resolve(getResult()).then(res, rej),
    }
    return builder
  }

  const drizzle = {
    select: vi.fn(() => makeBuilder(() => selectQueue.shift() ?? [])),
    insert: vi.fn(() => makeBuilder(() => undefined, undefined, v => captured.inserts.push(v))),
    update: vi.fn(() => makeBuilder(() => undefined, v => captured.updates.push(v))),
    delete: vi.fn(() => makeBuilder(() => undefined)),
  }

  return {
    service: { db: drizzle } as unknown as DatabaseService,
    drizzle,
    captured,
    queueSelect: rows => { selectQueue.push(rows) },
  }
}
