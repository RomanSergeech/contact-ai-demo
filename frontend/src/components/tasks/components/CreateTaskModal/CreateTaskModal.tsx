'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTasksStore, useContactsStore } from '@/shared/store'
import { Modal, modalCss as m, Button, Select, SelectDate, Textarea } from '@/shared/UI'
import { createTaskSchema, type TCreateTaskForm } from '@/shared/schemas'
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from '@/shared/types/tasks.types'
import type { TTaskPriority, TTaskStatus } from '@/shared/types/tasks.types'


interface Props {
  isActive: boolean
  initialContactId?: string
  onClose: () => void
}
const CreateTaskModal = ({ isActive, initialContactId, onClose }: Props) => {

  const createTask = useTasksStore(s => s.createTask)
  const contacts = useContactsStore(s => s.contacts)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TCreateTaskForm>({ resolver: zodResolver(createTaskSchema) })

  const titleValue = watch('title')

  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TTaskStatus>('no_deadline')
  const [priority, setPriority] = useState<TTaskPriority>('medium')
  const [contactId, setContactId] = useState<string>(initialContactId ?? '')
  const [deadline, setDeadline] = useState('')

  // сбрасываем форму при каждом открытии — компонент остаётся примонтированным
  useEffect(() => {
    if (!isActive) return
    reset()
    setDescription('')
    setStatus('no_deadline')
    setPriority('medium')
    setContactId(initialContactId ?? '')
    setDeadline('')
  }, [isActive, initialContactId, reset])

  const contactOptions = [
    { value: '', label: '— Без контакта —' },
    ...contacts.map(c => ({ value: c.id, label: c.full_name })),
  ]

  const onSubmit = (data: TCreateTaskForm) => {
    createTask({
      title: data.title.trim(),
      description: description.trim(),
      status,
      priority,
      contact_id: contactId || null,
      deadline: deadline || null,
    })
    onClose()
  }

  return (
    <Modal
      active={isActive}
      title="Новая задача"
      onClose={onClose}
      maxWidth={520}
    >
      <form
        id="create-task-form"
        className={m.body}
        onSubmit={handleSubmit(onSubmit)}
      >

        <div className={m.field}>
          <label>
            Название <span className={m.required}>*</span>
          </label>
          <Textarea
            placeholder="Введите название задачи"
            autoFocus
            rows={1}
            autoResize
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        <div className={m.row}>
          <div className={m.field}>
            <label>Статус</label>
            <Select
              options={TASK_STATUS_OPTIONS}
              value={status}
              onChange={v => setStatus(v as TTaskStatus)}
            />
          </div>
          <div className={m.field}>
            <label>Приоритет</label>
            <Select
              options={TASK_PRIORITY_OPTIONS}
              value={priority}
              onChange={v => setPriority(v as TTaskPriority)}
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
            <SelectDate
              value={deadline || null}
              onChange={v => setDeadline(v ?? '')}
              showTime
            />
          </div>
        </div>

        <div className={m.field}>
          <label>Описание</label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Необязательно..."
            rows={3}
            autoResize
          />
        </div>

      </form>
      <div className={m.footer}>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className={m.cancel_btn}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          form="create-task-form"
          disabled={!titleValue?.trim()}
        >
          Создать
        </Button>
      </div>
    </Modal>
  )
}

export { CreateTaskModal }
