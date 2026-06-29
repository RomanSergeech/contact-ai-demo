import { memo } from 'react'
import { Button, Checkbox } from '@/shared/UI'
import { PRIORITY_LABEL, PRIORITY_COLOR, RELATION_LABEL } from '@/shared/types/contact.types'
import type { TContact } from '@/shared/types/contact.types'

import c from './ContactRow.module.scss'


const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  contact: TContact
  index: number
  selected: boolean
  onToggleSelect: (id: string) => void
  onOpen: (id: string) => void
}

const ContactRow = memo(({ contact, index, selected, onToggleSelect, onOpen }: Props) => {

  const checkboxContainerClick = (e: React.MouseEvent<HTMLLIElement>) => {
    e.stopPropagation()
    onToggleSelect(contact.id)
  }

  return (
    <ul
      data-selected={selected}
      onClick={() => onOpen(contact.id)}
    >
      <li
        className={c.checkbox_col}
        onClick={checkboxContainerClick}
      >
        <Checkbox checked={selected} onChange={()=>{}} />
      </li>
      <li>{index + 1}</li>
      <li>{contact.full_name}</li>
      <li>{contact.position || '—'}</li>
      <li>
        <span
          className={c.priority_badge}
          style={{ color: PRIORITY_COLOR[contact.priority], backgroundColor: `${PRIORITY_COLOR[contact.priority]}22` }}
        >
          {PRIORITY_LABEL[contact.priority]}
        </span>
      </li>
      <li>
        <span className={c.relation_badge}>
          {RELATION_LABEL[contact.relationship_level]}
        </span>
      </li>
      <li>{formatDate(contact.next_event_date)}</li>
      <li>{formatDate(contact.last_contact)}</li>
      <li onClick={e => e.stopPropagation()}>
        <Button
          variant="primary"
          iconOnly
          className={c.open_btn}
          onClick={() => onOpen(contact.id)}
          title="Открыть контакт"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </li>
    </ul>
  )
})

export { ContactRow }
