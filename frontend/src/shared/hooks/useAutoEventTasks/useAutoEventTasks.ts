'use client'

import { useEffect, useRef } from 'react'
import { useContactsStore, useTasksStore } from '../../store'

import type { TTaskStatus } from '../../types/tasks.types'


const STORAGE_KEY = 'contact_ai_auto_tasks_v1'
const DAYS_BEFORE = 21  // 3 недели

// ─── Хелперы localStorage ──────────────────────────────────────────────────────

function getCreatedKeys(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function markCreated(key: string): void {
  const keys = getCreatedKeys()
  keys.add(key)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]))
}

// ─── Хелперы для работы с датами ───────────────────────────────────────────────

function nextOccurrence(isoDate: string): Date | null {
  const parts = isoDate.split('-')
  if (parts.length < 3) return null
  const month = parseInt(parts[1]!, 10) - 1
  const day = parseInt(parts[2]!, 10)
  if (isNaN(month) || isNaN(day)) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const thisYear = new Date(now.getFullYear(), month, day)
  return thisYear >= now ? thisYear : new Date(now.getFullYear() + 1, month, day)
}

function daysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - now.getTime()) / 86_400_000)
}

function statusFor(days: number): TTaskStatus {
  if (days <= 0)  return 'today'
  if (days <= 6)  return 'this_week'
  return 'no_deadline'
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0]!
}

// ─── Хук ────────────────────────────────────────────────────────────────────────

export function useAutoEventTasks() {
  const contacts = useContactsStore(s => s.contacts)
  const tasks = useTasksStore(s => s.tasks)
  const createTask = useTasksStore(s => s.createTask)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    if (!contacts?.length) return

    ranRef.current = true

    const createdKeys = getCreatedKeys()

    // уже существующие задачи (по контакту+названию+дате дедлайна) —
    // чтобы не плодить дубли при очищенном localStorage или на новом устройстве
    const existingKeys = new Set(
      tasks.map(t => `${t.contact_id ?? ''}|${t.title}|${t.deadline?.slice(0, 10) ?? ''}`),
    )

    const run = async () => {
      for (const contact of contacts) {
        const events: { key: string; title: string; date: Date }[] = []

        // ── День рождения ──────────────────────────────────────────────────────
        if (contact.birth_date) {
          const date = nextOccurrence(contact.birth_date)
          if (date) {
            const year = date.getFullYear()
            events.push({
              key: `${contact.id}_birth_${year}`,
              title: `День рождения: ${contact.full_name}`,
              date,
            })
          }
        }

        // ── Важные даты ───────────────────────────────────────────────────────
        for (const item of contact.important_dates ?? []) {
          if (!item.date || !item.label) continue

          // Важные даты — повторяются ежегодно (как ДР)
          const date = nextOccurrence(item.date)
          if (!date) continue
          const year = date.getFullYear()
          events.push({
            key: `${contact.id}_event_${item.date}_${year}`,
            title: `${item.label} — ${contact.full_name}`,
            date,
          })
        }

        // ── Создаём задачи ────────────────────────────────────────────────────
        for (const ev of events) {
          const days = daysUntil(ev.date)
          if (days < 0 || days > DAYS_BEFORE) continue  // не в окне 3 недель
          if (createdKeys.has(ev.key)) continue  // уже создавали

          const deadline = toISO(ev.date)

          // такая задача уже есть на сервере — помечаем и не дублируем
          if (existingKeys.has(`${contact.id}|${ev.title}|${deadline}`)) {
            markCreated(ev.key)
            createdKeys.add(ev.key)
            continue
          }

          try {
            await createTask({
              title: ev.title,
              description: `До события: ${days === 0 ? 'сегодня' : `${days} дн.`}`,
              status: statusFor(days),
              priority: contact.priority,
              contact_id: contact.id,
              deadline,
            })
            // помечаем только после успешного создания, иначе событие потеряется навсегда
            markCreated(ev.key)
            createdKeys.add(ev.key)
          } catch {
            // не удалось создать — не помечаем, попробуем при следующем заходе
          }
        }
      }
    }

    void run()
  }, [contacts, tasks])
}
