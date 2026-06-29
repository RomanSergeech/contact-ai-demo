'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/shared/store'
import { Button } from '@/shared/UI'
import { showAlert } from '@/shared/utils'

import c from './DangerZoneSection.module.scss'


const DangerZoneSection = () => {
  const deleteAccount = useAuthStore(state => state.deleteAccount)

  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      router.replace('/')
    } catch (err) {
      showAlert({
        text: [(err as Error).message ?? 'Не удалось удалить аккаунт'],
        btnText: 'Закрыть',
      }, 5000)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={c.danger_zone}>
      <p className={c.section_title}>Удаление аккаунта</p>
      <p className={c.field_label}>
        Все данные будут удалены безвозвратно: контакты, задачи и история чатов.
      </p>

      {confirm ? (
        <div className={c.confirm_row}>
          <span className={c.confirm_text}>Вы уверены? Это действие нельзя отменить.</span>
          <Button
            variant="ghost"
            className={c.cancel_btn}
            onClick={() => setConfirm(false)}
            disabled={deleting}
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            className={c.delete_btn}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Удаление...' : 'Да, удалить'}
          </Button>
        </div>
      ) : (
        <Button
          variant="danger"
          className={c.delete_btn}
          onClick={() => setConfirm(true)}
        >
          Удалить аккаунт
        </Button>
      )}
    </div>
  )
}

export { DangerZoneSection }
