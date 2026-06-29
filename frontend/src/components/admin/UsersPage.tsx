'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUserStore } from '@/shared/store'
import { AdminService } from '@/shared/api'
import { Button, Input, Select, Modal, modalCss as m } from '@/shared/UI'
import { Table } from '@/widgets'
import { showAlert } from '@/shared/utils'
import { createUserSchema, type TCreateUserForm } from '@/shared/schemas'

import type { TUser } from '@/shared/types/user.types'
import c from './page.module.scss'


const ROLE_OPTIONS = [
  { value: 'user', label: 'Пользователь' },
  { value: 'admin', label: 'Администратор' },
]

const ROLE_LABEL: Record<string, string> = {
  admin: 'Администратор',
  user: 'Пользователь',
}

const TITLES = [
  { value: 'Имя' },
  { value: 'Логин' },
  { value: 'Роль' },
  { value: 'Действия' },
]

const UsersPage = () => {
  const selfRole = useUserStore(s => s.role)
  const selfId = useUserStore(s => s.id)
  const router = useRouter()

  const [users, setUsers] = useState<TUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [role, setRole] = useState('user')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TCreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', login: '', password: '' },
  })

  const [nameVal, loginVal, passwordVal] = watch(['name', 'login', 'password'])
  const formFilled = !!nameVal && !!loginVal && (passwordVal?.length ?? 0) >= 6

  useEffect(() => {
    if (selfRole && selfRole !== 'admin') router.replace('/main')
  }, [selfRole, router])

  useEffect(() => {
    AdminService.getUsers()
      .then(r => setUsers(r.data))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (data: TCreateUserForm) => {
    try {
      const { data: user } = await AdminService.createUser({ ...data, role })
      setUsers(prev => [...prev, user])
      setModalOpen(false)
      reset()
      setRole('user')
    } catch (err) {
      showAlert({
        text: [(err as Error).message ?? 'Не удалось создать пользователя'],
        btnText: 'Закрыть',
      }, 5000)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await AdminService.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      showAlert({
        text: [(err as Error).message ?? 'Не удалось удалить пользователя'],
        btnText: 'Закрыть',
      }, 5000)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    reset()
    setRole('user')
  }

  if (selfRole !== 'admin') return null

  return (
    <div className={c.page}>
      <div className="_container">

        <div className={c.header_row}>
          <h1 className="title">
            Пользователи
          </h1>
          <Button
            variant="primary"
            onClick={() => setModalOpen(true)}
          >
            + Зарегистрировать
          </Button>
        </div>

        <Table
          titles={{ titles: TITLES }}
          loading={loading}
          emptyData={users.length === 0}
          emptyDataText="Пользователей пока нет"
          tableClassName={c.users_table}
          columns={() => (
            <>
              {users.map(u => (
                <ul key={u.id}>
                  <li>{u.name}</li>
                  <li>{u.login}</li>
                  <li>
                    <span
                      className={c.role_badge}
                      data-role={u.role}
                    >
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </li>
                  <li className={c.btns}>
                    <Button
                      className={c.delete_btn}
                      disabled={u.id === selfId || deletingId === u.id}
                      onClick={() => setConfirmId(u.id)}
                    >
                      {deletingId === u.id ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </li>
                </ul>
              ))}
            </>
          )}
        />

      </div>

      <Modal
        active={!!confirmId}
        title="Удалить пользователя?"
        onClose={() => setConfirmId(null)}
        maxWidth={380}
      >
        <div className={m.body}>
          <p>Это действие нельзя отменить.</p>
        </div>
        <div className={m.footer}>
          <Button
            variant="ghost"
            className={m.cancel_btn}
            onClick={() => setConfirmId(null)}
          >
            Отмена
          </Button>
          <Button
            variant="danger-outline"
            className={c.delete_btn}
            disabled={deletingId === confirmId}
            onClick={async () => {
              await handleDelete(confirmId!)
              setConfirmId(null)
            }}
          >
            {deletingId === confirmId ? 'Удаление...' : 'Удалить'}
          </Button>
        </div>
      </Modal>

      <Modal
        active={modalOpen}
        title="Новый пользователь"
        onClose={handleCloseModal}
        maxWidth={420}
      >
        <form
          id="create-user-form"
          className={m.body}
          onSubmit={handleSubmit(handleCreate)}
        >
          <div className={m.field}>
            <label>Имя</label>
            <Input
              placeholder="Иван Иванов"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <div className={m.field}>
            <label>Логин (email)</label>
            <Input
              type="email"
              placeholder="user@example.com"
              error={errors.login?.message}
              {...register('login')}
            />
          </div>

          <div className={m.field}>
            <label>Пароль</label>
            <Input
              type="password"
              placeholder="Минимум 6 символов"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div className={m.field}>
            <label>Роль</label>
            <Select
              options={ROLE_OPTIONS}
              value={role}
              onChange={setRole}
            />
          </div>
        </form>
        <div className={m.footer}>
          <Button
            type="button"
            variant="ghost"
            className={m.cancel_btn}
            onClick={handleCloseModal}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            disabled={!formFilled || isSubmitting}
          >
            {isSubmitting ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default UsersPage
