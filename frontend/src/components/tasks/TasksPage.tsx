'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useTasksStore, useContactsStore } from '@/shared/store'
import { Button, Select } from '@/shared/UI'
import { BoardView } from './components/BoardView/BoardView'
import { CalendarView } from './components/CalendarView/CalendarView'
import { TaskPanel } from './components/TaskPanel/TaskPanel'
import { CreateTaskModal } from './components/CreateTaskModal/CreateTaskModal'

import c from './page.module.scss'


const TABS = [
  { value: 'board', label: 'Доска' },
  { value: 'calendar', label: 'Календарь' },
] as const

type TTab = typeof TABS[number]['value']


const TasksPage = () => {

  const tasks = useTasksStore(s => s.tasks)
  const contacts = useContactsStore(s => s.contacts)

  const router = useRouter()
  const searchParams = useSearchParams()

  const [createOpen, setCreateOpen] = useState(() => !!searchParams.get('createFor'))
  const [filterContact, setFilterContact] = useState(() => searchParams.get('contact') ?? '')

  const tab: TTab = searchParams.get('tab') === 'calendar' ? 'calendar' : 'board'

  const setTab = (value: TTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`?${params.toString()}`)
  }

  const contactOptions = [
    { value: '', label: 'Все контакты' },
    ...contacts.map(c => ({ value: c.id, label: c.full_name })),
  ]

  const filteredContactName = filterContact
    ? contacts.find(c => c.id === filterContact)?.full_name
    : null

  const filteredTasks = tasks.filter(t => !filterContact || t.contact_id === filterContact)

  return (
    <div className={c.page}>

      <nav className={c.breadcrumbs}>
        <button
          className={c.crumb}
          onClick={() => router.push('/main')}
        >
          Контакты
        </button>
        <span className={c.crumb_sep}>/</span>
        {filteredContactName ? (
          <>
            <button
              className={c.crumb}
              onClick={() => setFilterContact('')}
            >
              Задачи
            </button>
            <span className={c.crumb_sep}>/</span>
            <button
              className={c.crumb}
              onClick={() => router.push(`/contacts/${filterContact}`)}
            >
              {filteredContactName}
            </button>
          </>
        ) : (
          <span className={c.crumb_active}>Задачи</span>
        )}
      </nav>

      <div className={c.top}>
        <div className={c.tabs}>
          {TABS.map(t => (
            <button
              key={t.value}
              className={c.tab}
              data-active={tab === t.value}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={c.top_right}>
          <Select
            options={contactOptions}
            value={filterContact}
            onChange={setFilterContact}
            className={c.contact_filter}
          />
          <Button onClick={() => setCreateOpen(true)}>
            + Создать задачу
          </Button>
        </div>
      </div>

      {tab === 'board' ? (
        <BoardView tasks={filteredTasks} />
      ) : (
        <CalendarView tasks={filteredTasks} />
      )}

      <TaskPanel />

      <CreateTaskModal
        isActive={createOpen}
        onClose={() => setCreateOpen(false)}
        initialContactId={searchParams.get('createFor') ?? undefined}
      />

    </div>
  )
}

export { TasksPage }
