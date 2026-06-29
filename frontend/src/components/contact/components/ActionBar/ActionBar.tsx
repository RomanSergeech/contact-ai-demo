'use client'

import { useState } from 'react'
import { useContactsStore } from '@/shared/store'
import { Button } from '@/shared/UI'
import { parseContactInfo } from '@/shared/utils'
import type { TContact } from '@/shared/types/contact.types'

import c from './ActionBar.module.scss'


interface Props {
  contact: TContact
  isScraping: boolean
}

const ActionBar = ({ contact, isScraping }: Props) => {

  const { updateContact } = useContactsStore()

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { id, user_id, created_at, next_event_date, chat_history, last_vk_analysis_at, last_tg_analysis_at, ...updates } = contact
      await updateContact(id, { ...updates, contact_info: parseContactInfo(updates.contact_info) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={c.save_bar}>
      <Button
        variant="primary"
        className={c.save_btn}
        onClick={handleSave}
        disabled={saving || isScraping}
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </div>
  )
}

export { ActionBar }
