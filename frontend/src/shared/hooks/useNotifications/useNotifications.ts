'use client'

import { useMemo } from 'react'
import { useContactsStore, useTasksStore } from '../../store'
import { getNotifications } from '../../utils'
import type { TNotificationsData } from '../../utils'

// Модульный кэш: Header и NotificationsPanel дёргают расчёт одновременно —
// при одинаковых ссылках tasks/contacts второй потребитель переиспользует результат
let cache: { tasks: unknown; contacts: unknown; value: TNotificationsData } | null = null

export const useNotifications = (): TNotificationsData => {
  const tasks = useTasksStore(s => s.tasks)
  const contacts = useContactsStore(s => s.contacts)

  return useMemo(() => {
    if (cache && cache.tasks === tasks && cache.contacts === contacts) return cache.value
    const value = getNotifications(tasks, contacts)
    cache = { tasks, contacts, value }
    return value
  }, [tasks, contacts])
}
