import { Button, Input, SelectDate } from '@/shared/UI'
import type { TContact, TImportantDate } from '@/shared/types/contact.types'

import c from './ImportantDates.module.scss'


interface Props {
  contact: TContact
  set: <K extends keyof TContact>(field: K, value: TContact[K]) => void
}

const ImportantDates = ({ contact, set }: Props) => {

  const onAdd = () => {
    set('important_dates', [...(contact.important_dates ?? []), { label: '', date: '' }])
  }

  const onUpdate = (idx: number, field: keyof TImportantDate, value: string) => {
    const dates = [...(contact.important_dates ?? [])]
    dates[idx] = { ...dates[idx]!, [field]: value }
    set('important_dates', dates)
  }

  const onRemove = (idx: number) => {
    set('important_dates', (contact.important_dates ?? []).filter((_, i) => i !== idx))
  }

  return (
    <div className={c.section}>
      <p className={c.section_title}>Важные даты</p>
      <div className={c.dates_list}>
        {(contact.important_dates ?? []).map((d, idx) => (
          <div key={idx} className={c.date_row}>
            <Input
              value={d.label}
              onChange={e => onUpdate(idx, 'label', e.target.value)}
              placeholder="Название (напр. ДР Супруги)"
            />
            <SelectDate
              value={d.date || null}
              onChange={v => onUpdate(idx, 'date', v ?? '')}
              showTime
            />
            <Button
              variant="danger"
              iconOnly
              className={c.date_remove_btn}
              onClick={() => onRemove(idx)}
              title="Удалить"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>
        ))}
        <Button
          variant="text"
          className={c.add_date_btn}
          onClick={onAdd}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Добавить дату
        </Button>
      </div>
    </div>
  )
}

export { ImportantDates }
