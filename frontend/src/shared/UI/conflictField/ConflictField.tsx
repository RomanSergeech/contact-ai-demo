'use client'

import { useState } from 'react'
import { cn } from '@/shared/utils'

import c from './ConflictField.module.scss'

interface Props {
  label: string
  oldValue: string
  newValue: string
  multiline?: boolean
  loading?: boolean
  mergeable?: boolean
  onResolve: (choice: 'old' | 'new' | 'merge') => void
}

const ConflictField = ({ label, oldValue, newValue, multiline, loading, mergeable = true, onResolve }: Props) => {

  const [selected, setSelected] = useState<'old' | 'new'>('new')

  const handleSelect = (choice: 'old' | 'new') => {
    setSelected(choice)
    onResolve(choice)
  }

  return (
    <div className={c.field}>
      <label>{label}</label>

      <div
        className={c.conflict_block}
        data-multiline={multiline}
        data-loading={loading}
      >
        <div
          className={c.conflict_rows}
          data-mergeable={mergeable}
        >
          <div
            className={cn(c.conflict_row, c.row_old)}
            onClick={() => !loading && handleSelect('old')}
          >
            <span className={c.hover_hint}>Оставить этот</span>
            {oldValue}
          </div>
          <div
            className={cn(c.conflict_row, c.row_new)}
            onClick={() => !loading && handleSelect('new')}
          >
            <span className={c.hover_hint}>Оставить этот</span>
            {newValue}
          </div>
        </div>

        {mergeable &&
          <button
            type="button"
            className={c.merge_btn}
            disabled={loading}
            title="Объединить"
            onClick={() => !loading && onResolve('merge')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        }

        {loading &&
          <div className={c.overlay}>
            <div className={c.spinner} />
          </div>
        }
      </div>
    </div>
  )
}

export { ConflictField }
