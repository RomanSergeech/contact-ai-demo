'use client'

import DatePicker from 'react-datepicker'
import { cn } from '@/shared/utils'

import 'react-datepicker/dist/react-datepicker.css'
import c from './select.module.scss'


interface Props {
  value: string | null
  onChange: (date: string | null) => void
  readOnly?: boolean
  className?: string
  showTime?: boolean
}

const formatLocalDateTime = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

const SelectDate = ({ value, onChange, readOnly, className, showTime }: Props) => {
  const selected = value ? new Date(value.replace(' ', 'T')) : null
  const hasTime = !!selected && (selected.getHours() !== 0 || selected.getMinutes() !== 0)

  const handleChange = (date: Date | null) => {
    if (readOnly) return
    if (!date) return onChange(null)
    if (showTime && !selected) date.setHours(0, 0, 0, 0)
    onChange(showTime ? formatLocalDateTime(date) : date.toISOString().slice(0, 10))
  }

  return (
    <div className={cn(c.date_wrap, className)} data-disabled={readOnly}>
      <DatePicker
        selected={selected}
        onChange={handleChange}
        dateFormat={showTime && hasTime ? 'dd.MM.yyyy HH:mm' : 'dd.MM.yyyy'}
        placeholderText="—"
        readOnly={readOnly}
        popperPlacement="bottom-start"
        calendarClassName={c.calendar}
        wrapperClassName={c.date_picker_wrap}
        showTimeSelect={showTime}
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Время"
        portalId="datepicker-portal"
      />
      <svg className={c.date_icon} width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="2.5" width="12" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1 5.5h12" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export { SelectDate }
