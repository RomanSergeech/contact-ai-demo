'use client'

import { useState, useMemo } from 'react'
import { useTasksStore, useContactsStore } from '@/shared/store'
import { Modal, modalCss as m, Select, SelectDate, Textarea, Button } from '@/shared/UI'
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '@/shared/types/tasks.types'
import type { TTask, TTaskStatus, TTaskPriority } from '@/shared/types/tasks.types'

import c from './TaskPanel.module.scss'


const TaskPanel = () => {
  const tasks = useTasksStore(s => s.tasks)
  const openedTaskId = useTasksStore(s => s.openedTaskId)
  const closeTask = useTasksStore(s => s.closeTask)

  const task = tasks.find(t => t.id === openedTaskId) ?? null

  return (
    <Modal
      active={!!task}
      title="Задача"
      onClose={closeTask}
      maxWidth={540}
    >
      {task &&
        <TaskPanelContent key={task.id} task={task} />
      }
    </Modal>
  )
}

interface ContentProps { task: TTask }

const TaskPanelContent = ({ task }: ContentProps) => {
  const updateTask = useTasksStore(s => s.updateTask)
  const deleteTask = useTasksStore(s => s.deleteTask)
  const contacts = useContactsStore(s => s.contacts)

  const [title, setTitle]       = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [status, setStatus]     = useState<TTaskStatus>(task.status)
  const [priority, setPriority] = useState<TTaskPriority>(task.priority)
  const [contactId, setContactId] = useState(task.contact_id ?? '')
  const [deadline, setDeadline] = useState<string | null>(task.deadline)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Снапшот последнего сохранения — сравниваем с ним, а не с task из стора,
  // чтобы не зависеть от формата значений в ответе сервера
  const [snapshot, setSnapshot] = useState({
    title:       task.title,
    description: task.description,
    status:      task.status,
    priority:    task.priority,
    contactId:   task.contact_id ?? '',
    deadline:    task.deadline,
  })

  const isDirty = useMemo(() => (
    title.trim() !== snapshot.title ||
    description !== snapshot.description ||
    status !== snapshot.status ||
    priority !== snapshot.priority ||
    contactId !== snapshot.contactId ||
    deadline !== snapshot.deadline
  ), [title, description, status, priority, contactId, deadline, snapshot])

  const contactOptions = [
    { value: '', label: '— Без контакта —' },
    ...contacts.map(ct => ({ value: ct.id, label: ct.full_name })),
  ]

  const handleSave = async () => {
    if (!isDirty || !title.trim()) return
    setSaving(true)
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description,
        status,
        priority,
        contact_id: contactId || null,
        deadline,
      } as Partial<TTask>)
      setSnapshot({ title: title.trim(), description, status, priority, contactId, deadline })
    } catch {
      // ошибка уже показана через showAlert в сторе
    } finally {
      setSaving(false)
    }
  }

  const handleMarkDone = async () => {
    setStatus('done')
    // сразу двигаем снапшот, чтобы кнопка «Сохранить» не активировалась зря
    setSnapshot(prev => ({ ...prev, status: 'done' }))
    try {
      await updateTask(task.id, { status: 'done' } as Partial<TTask>)
    } catch {
      // ошибка уже показана через showAlert в сторе
    }
  }

  return (
    <>
      <div className={c.task_body}>

        <div className={m.field}>
          <label>Название</label>
          <Textarea
            className={c.panel_title_input}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Название задачи"
            rows={1}
            autoResize
          />
        </div>

        <div className={m.row}>
          <div className={m.field}>
            <label>Статус</label>
            <Select
              options={TASK_STATUS_OPTIONS}
              value={status}
              onChange={val => setStatus(val as TTaskStatus)}
            />
          </div>
          <div className={m.field}>
            <label>Приоритет</label>
            <Select
              options={TASK_PRIORITY_OPTIONS}
              value={priority}
              onChange={val => setPriority(val as TTaskPriority)}
            />
          </div>
        </div>

        <div className={m.row}>
          <div className={m.field}>
            <label>Контакт</label>
            <Select
              options={contactOptions}
              value={contactId}
              onChange={setContactId}
            />
          </div>
          <div className={m.field}>
            <label>Дедлайн</label>
            <div className={c.deadline_wrap}>
              <SelectDate
                value={deadline}
                onChange={date => setDeadline(date)}
                showTime
              />
              {deadline &&
                <Button
                  type="button"
                  variant="secondary"
                  iconOnly
                  className={c.deadline_clear}
                  onClick={() => setDeadline(null)}
                  aria-label="Сбросить дедлайн"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </Button>
              }
            </div>
          </div>
        </div>

        <div className={c.description_field}>
          <label>Описание</label>
          <Textarea
            className={c.description_textarea}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Добавьте описание..."
            autoResize
          />
        </div>

      </div>

      <div className={c.panel_footer}>
        <div className={c.footer_left}>
          <Button
            variant="danger"
            className={c.delete_btn}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Удалить
          </Button>

          {status !== 'done' &&
            <Button
              variant="success"
              className={c.done_btn}
              onClick={handleMarkDone}
            >
              ✓ Задача выполнена
            </Button>
          }
        </div>

        <Button
          variant="primary"
          className={c.save_btn}
          onClick={handleSave}
          disabled={!isDirty || !title.trim() || saving}
        >
          {saving ? <span className={c.save_spinner} /> : 'Сохранить'}
        </Button>
      </div>

      <Modal
        active={confirmDeleteOpen}
        title="Удалить задачу?"
        onClose={() => setConfirmDeleteOpen(false)}
        maxWidth={380}
      >
        <div className={m.body}>
          <p>Это действие нельзя отменить.</p>
        </div>
        <div className={m.footer}>
          <Button variant="ghost" className={m.cancel_btn} onClick={() => setConfirmDeleteOpen(false)}>
            Отмена
          </Button>
          <Button variant="danger" className={c.delete_btn} onClick={() => deleteTask(task.id)}>
            Удалить
          </Button>
        </div>
      </Modal>
    </>
  )
}

export { TaskPanel }
