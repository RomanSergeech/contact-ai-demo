import type { TTask } from '@/shared/types/tasks.types'
import type { TContact } from '@/shared/types/contact.types'

export type TNotificationVariant = 'danger' | 'warning' | 'info' | 'muted'

export type TNotificationItem = {
  id: string
  text: string
  subtext?: string
  contactId?: string
  isTask?: boolean
  variant: TNotificationVariant
}

export type TNotificationsData = {
  today: TNotificationItem[]
  tomorrow: TNotificationItem[]
  week: TNotificationItem[]
}

const startOfDay = (d: Date): Date => {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const addDays = (d: Date, n: number): Date => {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// Ближайшее вхождение даты (по месяцу+дню) начиная с from
const nextOccurrence = (d: Date, from: Date): Date => {
  const thisYear = new Date(from.getFullYear(), d.getMonth(), d.getDate())
  return thisYear >= from
    ? thisYear
    : new Date(from.getFullYear() + 1, d.getMonth(), d.getDate())
}

export const getNotifications = (tasks: TTask[], contacts: TContact[]): TNotificationsData => {
  const now = startOfDay(new Date())
  const tomorrow = addDays(now, 1)
  const weekEnd = addDays(now, 7)
  const dayAfterTomorrow = addDays(now, 2)
  const thirtyDaysAgo = addDays(now, -30)

  const todayItems: TNotificationItem[] = []
  const tomorrowItems: TNotificationItem[] = []
  const weekItems: TNotificationItem[] = []

  // Задачи: сегодня (просрочено + дедлайн сегодня) и завтра (все приоритеты)
  for (const task of tasks) {
    if (task.status === 'done' || !task.deadline) continue

    const deadlineDate = startOfDay(new Date(task.deadline))

    if (deadlineDate < now) {
      todayItems.push({
        id: `task-overdue-${task.id}`,
        text: task.title,
        subtext: 'Просроченная задача',
        isTask: true,
        variant: 'danger',
      })
    } else if (sameDay(deadlineDate, now)) {
      todayItems.push({
        id: `task-today-${task.id}`,
        text: task.title,
        subtext: 'Задача на сегодня',
        isTask: true,
        variant: 'warning',
      })
    } else if (sameDay(deadlineDate, tomorrow)) {
      tomorrowItems.push({
        id: `task-tomorrow-${task.id}`,
        text: task.title,
        subtext: 'Задача на завтра',
        isTask: true,
        variant: 'warning',
      })
    }
  }

  // Важные даты: сегодня, завтра и диапазон 2–7 дней (ежегодно по месяцу+дню)
  for (const contact of contacts) {
    for (const imp of contact.important_dates ?? []) {
      const d = new Date(imp.date)
      if (isNaN(d.getTime())) continue

      const occ = nextOccurrence(d, now)

      if (sameDay(occ, now)) {
        todayItems.push({
          id: `date-today-${contact.id}-${imp.label}`,
          text: contact.full_name,
          subtext: imp.label,
          contactId: contact.id,
          variant: 'info',
        })
      } else if (sameDay(occ, tomorrow)) {
        tomorrowItems.push({
          id: `date-tomorrow-${contact.id}-${imp.label}`,
          text: contact.full_name,
          subtext: imp.label,
          contactId: contact.id,
          variant: 'info',
        })
      } else if (occ >= dayAfterTomorrow && occ <= weekEnd) {
        weekItems.push({
          id: `date-week-${contact.id}-${imp.label}`,
          text: contact.full_name,
          subtext: imp.label,
          contactId: contact.id,
          variant: 'info',
        })
      }
    }
  }

  // Давно не было касания (> 30 дней или никогда, если контакт старше 30 дней)
  for (const contact of contacts) {
    const lastContact = contact.last_contact ? startOfDay(new Date(contact.last_contact)) : null
    const createdAt = startOfDay(new Date(contact.created_at))

    const noContact = !lastContact
      ? createdAt < thirtyDaysAgo
      : lastContact < thirtyDaysAgo

    if (!noContact) continue

    const daysSince = lastContact
      ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : null

    todayItems.push({
      id: `no-contact-${contact.id}`,
      text: contact.full_name,
      subtext: daysSince !== null ? `${daysSince} дн. без касания` : 'Касания не было',
      contactId: contact.id,
      variant: 'muted',
    })
  }

  return { today: todayItems, tomorrow: tomorrowItems, week: weekItems }
}
