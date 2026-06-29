import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useContactsStore } from '@/shared/store'
import { Button, Textarea } from '@/shared/UI'
import { showAlert } from '@/shared/utils'
import { PRIORITY_LABEL, PRIORITY_COLOR, RELATION_LABEL } from '@/shared/types/contact.types'
import type { TContact } from '@/shared/types/contact.types'

import c from './Sidebar.module.scss'


const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE = 5 * 1024 * 1024

interface Props {
  contact: TContact
  set: <K extends keyof TContact>(field: K, value: TContact[K]) => void
}

const Sidebar = ({ contact, set }: Props) => {

  const uploadContactPhoto = useContactsStore(s => s.uploadContactPhoto)
  const deleteContactPhoto = useContactsStore(s => s.deleteContactPhoto)
  const deleteContact = useContactsStore(s => s.deleteContact)

  const [deleting, setDeleting] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)

  const router = useRouter()

  const photoInputRef = useRef<HTMLInputElement>(null)

  const handleDelete = async () => {
    if (!confirm('Удалить контакт?')) return
    setDeleting(true)
    try {
      await deleteContact(contact.id)
      router.push('/main')
    } finally {
      setDeleting(false)
    }
  }

  const handlePhotoClick = () => {
    if (contact.photo) return
    photoInputRef.current?.click()
  }

  const handleDeletePhoto = async () => {
    if (deletingPhoto) return
    setDeletingPhoto(true)
    try {
      await deleteContactPhoto(contact.id)
      set('photo', null)
    } finally {
      setDeletingPhoto(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      showAlert({
        text: ['Поддерживаются только изображения JPEG, PNG или WebP'],
        btnText: 'Закрыть',
      }, 5000)
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      showAlert({
        text: ['Файл слишком большой — максимум 5 МБ'],
        btnText: 'Закрыть',
      }, 5000)
      return
    }

    await uploadContactPhoto(contact.id, file)
    const updatedContact = useContactsStore.getState().contacts.find(c => c.id === contact.id)
    if (updatedContact) set('photo', updatedContact.photo ?? null)
  }

  const initials = contact.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className={c.sidebar}>

      <div className={c.photo_block}>

        <div
          className={c.photo_wrap}
          onClick={contact.photo ? undefined : handlePhotoClick}
          title={contact.photo ? undefined : 'Нажмите чтобы добавить фото'}
        >

          {contact.photo
            ? <img
                className={c.photo_img}
                src={contact.photo}
                alt={contact.full_name}
              />
            : <div className={c.photo_placeholder}>{initials}</div>
          }

          {contact.photo
            ? <div
                className={c.photo_overlay}
                data-action="delete"
                onClick={handleDeletePhoto}
              >
                {deletingPhoto ? 'Удаление...' : 'Удалить аватар'}
              </div>
            : <div className={c.photo_overlay}>Добавить фото</div>
          }
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handlePhotoChange}
        />

        <p className={c.contact_name}>{contact.full_name}</p>

        {contact.position &&
          <p className={c.contact_position}>{contact.position}</p>
        }

        <div className={c.badges}>
          <div className={c.badge_item}>
            <span
              className={c.priority_badge}
              style={{ color: PRIORITY_COLOR[contact.priority], backgroundColor: `${PRIORITY_COLOR[contact.priority]}22` }}
            >
              {PRIORITY_LABEL[contact.priority]}
            </span>
            <span className={c.badge_label}>Приоритет</span>
          </div>

          <div className={c.badge_item}>
            <span className={c.relation_badge}>{RELATION_LABEL[contact.relationship_level]}</span>
            <span className={c.badge_label}>Отношения</span>
          </div>
        </div>
      </div>

      <div className={c.note_block}>
        <span className={c.meta_label}>Заметка</span>
        <Textarea
          value={contact.note ?? ''}
          onChange={e => set('note', e.target.value)}
          placeholder="Заметка о контакте"
          autoResize
        />
      </div>

      <div className={c.meta_block}>
        {contact.last_contact &&
          <div className={c.meta_row}>
            <span className={c.meta_label}>Последний контакт</span>
            <span className={c.meta_value}>{new Date(contact.last_contact).toLocaleDateString('ru-RU')}</span>
          </div>
        }
        {contact.next_event_date &&
          <div className={c.meta_row}>
            <span className={c.meta_label}>Ближайшее событие</span>
            <span className={c.meta_value}>{new Date(contact.next_event_date).toLocaleDateString('ru-RU')}</span>
          </div>
        }
        {contact.birth_date &&
          <div className={c.meta_row}>
            <span className={c.meta_label}>Дата рождения</span>
            <span className={c.meta_value}>{new Date(contact.birth_date).toLocaleDateString('ru-RU')}</span>
          </div>
        }
        {contact.company &&
          <div className={c.meta_row}>
            <span className={c.meta_label}>Компания</span>
            <span className={c.meta_value}>{contact.company}</span>
          </div>
        }
      </div>

      <div className={c.task_actions}>
        <Button
          variant="primary"
          className={c.task_action_btn}
          onClick={() => router.push(`/tasks?createFor=${contact.id}`)}
        >
          + Добавить задачу
        </Button>
        <Button
          variant="outline"
          className={c.task_action_btn_outline}
          onClick={() => router.push(`/tasks?contact=${contact.id}`)}
        >
          Посмотреть задачи
        </Button>
      </div>

      <div className={c.delete_block}>
        <Button
          variant="danger-outline"
          className={c.delete_btn}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Удаление...' : 'Удалить контакт'}
        </Button>
      </div>

    </div>
  )
}

export { Sidebar }
