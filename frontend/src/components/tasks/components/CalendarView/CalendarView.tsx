'use client'

import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasksStore } from '@/shared/store'
import { Button, Select } from '@/shared/UI'
import { arrayFromTo, deadlineTime } from '@/shared/utils'
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/shared/types/tasks.types'
import type { TTask } from '@/shared/types/tasks.types'

import c from './CalendarView.module.scss'


const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const monthVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -dir * 24 }),
}

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const MONTH_OPTIONS = arrayFromTo(0, 11).map(month => ({
  value: String(month),
  label: new Date(2000, month, 1).toLocaleDateString('ru-RU', { month: 'long' }),
}))


interface Props { tasks: TTask[] }

const CalendarView = ({ tasks }: Props) => {

  const openTask = useTasksStore(s => s.openTask)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [direction, setDirection] = useState(0)

  // считаем годы при монтировании, а не на загрузке модуля (долгоживущий SPA)
  const yearOptions = useMemo(() => arrayFromTo(0, 8).map(i => {
    const y = new Date().getFullYear() - 4 + i
    return { value: String(y), label: String(y) }
  }), [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const changeMonth = (next: Date) => {
    setDirection(next.getTime() > viewDate.getTime() ? 1 : -1)
    setViewDate(next)
    setExpandedKey(null)
  }

  const goPrevMonth = () => changeMonth(new Date(year, month - 1, 1))
  const goNextMonth = () => changeMonth(new Date(year, month + 1, 1))
  const goToday = () => changeMonth(new Date())

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TTask[]>()
    tasks.forEach(task => {
      if (!task.deadline) return
      const key = task.deadline.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    })
    return map
  }, [tasks])

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const startOffset = (firstOfMonth.getDay() + 6) % 7
    const gridStart = new Date(year, month, 1 - startOffset)

    return arrayFromTo(0, 41).map(i => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }, [year, month])

  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
    return result
  }, [cells])

  const todayKey = toDateKey(new Date())

  const toggleExpanded = (key: string) => setExpandedKey(prev => prev === key ? null : key)

  return (
    <div className={c.calendar}>

      <div className={c.toolbar}>
        <div className={c.month_select}>
          <Select
            options={MONTH_OPTIONS}
            value={String(month)}
            onChange={v => changeMonth(new Date(year, Number(v), 1))}
          />
          <Select
            options={yearOptions}
            value={String(year)}
            onChange={v => changeMonth(new Date(Number(v), month, 1))}
          />
        </div>
        <div className={c.nav}>
          <Button
            onClick={goPrevMonth}
            className={c.nav_btn}
          >
            ←
          </Button>
          <Button
            onClick={goToday}
            className={c.today_btn}
          >
            Текущий
          </Button>
          <Button
            onClick={goNextMonth}
            className={c.nav_btn}
          >
            →
          </Button>
        </div>
      </div>

      <div className={c.grid}>

        {WEEK_DAYS.map(day => (
          <div
            key={day}
            className={c.weekday}
          >
            {day}
          </div>
        ))}

      </div>

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={`${year}-${month}`}
          className={c.month_grid}
          custom={direction}
          variants={monthVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >

          {weeks.map((week, wi) => (
            <Fragment key={wi}>

              {week.map(date => {
                const key = toDateKey(date)
                const dayTasks = tasksByDate.get(key) ?? []

                return (
                  <motion.div
                    key={key}
                    className={c.cell}
                    data-outside={date.getMonth() !== month}
                    data-today={key === todayKey}
                    data-expanded={key === expandedKey}
                    onClick={() => toggleExpanded(key)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className={c.cell_day}>{date.getDate()}</span>

                    <div className={c.cell_tasks}>
                      {dayTasks.map(task => (
                        <button
                          key={task.id}
                          className={c.task_item}
                          onClick={e => { e.stopPropagation(); openTask(task.id) }}
                          title={task.title}
                        >
                          <span
                            className={c.task_dot}
                            style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
                          />
                          {task.deadline && deadlineTime(task.deadline) &&
                            <span className={c.task_time}>{deadlineTime(task.deadline)}</span>
                          }
                          <span className={c.task_title}>{task.title}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )
              })}

              <AnimatePresence>
                {(() => {
                  const expandedDate = week.find(date => toDateKey(date) === expandedKey)
                  if (!expandedDate) return null

                  const dayTasks = tasksByDate.get(expandedKey!) ?? []

                  return (
                    <motion.div
                      className={c.expanded_panel}
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <div className={c.expanded_panel_inner}>
                        <div className={c.expanded_header}>
                          {expandedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
                        </div>

                        <div className={c.expanded_tasks}>
                          {dayTasks.map((task, i) => (
                            <motion.button
                              key={task.id}
                              className={c.expanded_task}
                              onClick={() => openTask(task.id)}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15, delay: i * 0.04 }}
                              whileHover={{ x: 2 }}
                            >
                              <span
                                className={c.expanded_task_dot}
                                style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
                              />
                              {task.deadline && deadlineTime(task.deadline) &&
                                <span className={c.expanded_task_time}>{deadlineTime(task.deadline)}</span>
                              }
                              <span className={c.expanded_task_title}>{task.title}</span>
                              <span
                                className={c.expanded_task_priority}
                                style={{ color: PRIORITY_COLOR[task.priority] }}
                              >
                                {PRIORITY_LABEL[task.priority]}
                              </span>
                            </motion.button>
                          ))}

                          {dayTasks.length === 0 &&
                            <div className={c.expanded_empty}>Нет задач на этот день</div>
                          }
                        </div>
                      </div>
                    </motion.div>
                  )
                })()}
              </AnimatePresence>

            </Fragment>
          ))}

        </motion.div>
      </AnimatePresence>

    </div>
  )
}

export { CalendarView }
