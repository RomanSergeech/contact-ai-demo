import { memo } from 'react'
import { Button } from '@/shared/UI'

import c from './MainToolbar.module.scss'


interface Props {
  selectedCount: number
  deletingMany: boolean
  hasDraft: boolean
  onDeleteClick: () => void
  onDraftClick: () => void
  onCreateClick: () => void
  onVoiceClick: () => void
}

const MainToolbar = memo(({ selectedCount, deletingMany, hasDraft, onDeleteClick, onDraftClick, onCreateClick, onVoiceClick }: Props) => {

  return (
    <div className={c.top_right}>
      {selectedCount > 0 &&
        <Button
          variant="danger"
          className={c.delete_btn}
          onClick={onDeleteClick}
          disabled={deletingMany}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H5H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11V17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11V17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Удалить</span>
          ({selectedCount})
        </Button>
      }

      {hasDraft &&
        <Button
          variant="ghost"
          className={c.draft_btn}
          onClick={onDraftClick}
          title="Открыть черновик контакта"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Черновик</span>
        </Button>
      }

      <Button onClick={onCreateClick}>
        + Добавить контакт
      </Button>

      <Button
        variant="surface"
        iconOnly
        className={c.mic_btn}
        onClick={onVoiceClick}
        title="Создать контакт голосом"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/>
          <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </Button>
    </div>
  )
})

export { MainToolbar }
