import type { TContactScrapingLog, TLogChange } from '@/shared/types/contact.types'

// Находит первый неразрешённый конфликт по имени поля среди логов скрапинга
export const findConflict = (
  conflicts: TContactScrapingLog[],
  field: string,
): (TLogChange & { logId: string }) | undefined => {
  for (const log of conflicts) {
    const change = log.changes.find(c => c.field === field && !c.resolution)
    if (change) return { ...change, logId: log.id }
  }
  return undefined
}
