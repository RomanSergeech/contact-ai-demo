'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useTasksStore } from '@/shared/store'
import { TaskCard } from '../TaskCard/TaskCard'
import type { TTask, TTaskStatus } from '@/shared/types/tasks.types'

import c from './BoardView.module.scss'


const COLUMNS: { status: TTaskStatus; label: string; color: string }[] = [
  { status: 'overdue',     label: 'Просрочены',      color: 'var(--color-red)' },
  { status: 'today',       label: 'На сегодня',      color: 'var(--color-orange)' },
  { status: 'this_week',   label: 'На этой неделе',  color: 'var(--color-main)' },
  { status: 'no_deadline', label: 'Без срока',       color: 'var(--color-grey)' },
  { status: 'done',        label: 'Выполнены',       color: 'var(--color-green)' },
]


interface Props { tasks: TTask[] }

const BoardView = ({ tasks }: Props) => {

  const moveTask = useTasksStore(s => s.moveTask)
  const [dragOverCol, setDragOverCol] = useState<TTaskStatus | null>(null)

  const handleDrop = (e: React.DragEvent, status: TTaskStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('taskId')
    if (id) moveTask(id, status)
    setDragOverCol(null)
  }

  return (
    <div className={c.board}>
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status)

        return (
          <div
            key={col.status}
            className={c.column}
            data-drag-over={dragOverCol === col.status}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.status) }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
            }}
            onDrop={e => handleDrop(e, col.status)}
          >
            <div className={c.col_header}>
              <span
                className={c.col_dot}
                style={{ backgroundColor: col.color }}
              />
              <span className={c.col_label}>{col.label}</span>
              <span className={c.col_count}>{colTasks.length}</span>
            </div>

            <ColumnTasks count={colTasks.length}>

              <AnimatePresence initial={false}>
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </AnimatePresence>

              {colTasks.length === 0 && (
                <div className={c.col_empty}>Нет задач</div>
              )}

            </ColumnTasks>
          </div>
        )
      })}
    </div>
  )
}

interface ColumnTasksProps {
  count: number
  children: React.ReactNode
}

const ColumnTasks = ({ count, children }: ColumnTasksProps) => {

  const ref = useRef<HTMLDivElement>(null)
  const prevCount = useRef(count)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prevCount.current === count) return
    prevCount.current = count

    const startHeight = el.getBoundingClientRect().height
    el.style.transition = 'none'
    el.style.height = 'auto'
    const endHeight = el.getBoundingClientRect().height
    el.style.height = `${startHeight}px`

    requestAnimationFrame(() => {
      el.style.transition = ''
      el.style.height = `${endHeight}px`
    })
  }, [count])

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === 'height' && ref.current) ref.current.style.height = 'auto'
  }

  return (
    <div
      ref={ref}
      className={c.col_tasks}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  )
}

export { BoardView }
