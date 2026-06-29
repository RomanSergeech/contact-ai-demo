'use client'

import { motion } from 'framer-motion'
import { useTasksStore, useContactsStore } from '@/shared/store'
import { formatDate, isOverdue, deadlineTime } from '@/shared/utils'
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/shared/types/tasks.types'
import type { TTask } from '@/shared/types/tasks.types'

import c from './TaskCard.module.scss'


const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M1 7H15" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 1V4M11 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)


interface Props { task: TTask }

const TaskCard = ({ task }: Props) => {
  const openTask = useTasksStore(s => s.openTask)
  const contacts = useContactsStore(s => s.contacts)

  const contact = task.contact_id ? contacts.find(c => c.id === task.contact_id) : null

  const handleDragStart: React.DragEventHandler<HTMLDivElement> = e => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <motion.div
      className={c.card}
      draggable
      onDragStart={handleDragStart as unknown as (event: MouseEvent | TouchEvent | PointerEvent, info: unknown) => void}
      onClick={() => openTask(task.id)}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className={c.card_top}>
        <span
          className={c.priority}
          style={{ color: PRIORITY_COLOR[task.priority] }}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        {contact &&
          <span className={c.contact_tag} title={contact.full_name}>
            {contact.full_name}
          </span>
        }
      </div>

      <p className={c.card_title}>{task.title}</p>

      {task.description &&
        <p className={c.card_desc}>{task.description}</p>
      }

      <div className={c.card_bottom}>
        {task.deadline &&
          <span
            className={c.card_deadline}
            data-overdue={isOverdue(task.deadline)}
          >
            <CalendarIcon />
            {formatDate(task.deadline)}
            {deadlineTime(task.deadline) && ` · ${deadlineTime(task.deadline)}`}
          </span>
        }
      </div>
    </motion.div>
  )
}

export { TaskCard }
