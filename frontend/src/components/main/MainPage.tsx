'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useContactsStore } from '@/shared/store'
import { Pages } from '@/shared/config/pages.config'
import { Table } from '@/widgets'
import { ContactRow, MainToolbar } from './components'
import { DeleteContactsModal } from './modals/DeleteContactsModal/DeleteContactsModal'
import { CreateContactModal, DRAFT_KEY } from './modals/CreateContactModal/CreateContactModal'
import type { TCreateContactData } from './modals/CreateContactModal/CreateContactModal'

import c from './page.module.scss'


const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const TITLES = [
  { value: '' },
  { value: '#' },
  { value: 'ФИО' },
  { value: 'Должность' },
  { value: 'Приоритет', key: 'priority', sort: true as const },
  { value: 'Отношения' },
  { value: 'Ближ. событие', key: 'next_event_date', sort: true as const },
  { value: 'Посл. контакт', key: 'last_contact', sort: true as const },
  { value: '' },
]

const loadDraft = (): TCreateContactData | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as TCreateContactData) : null
  } catch { return null }
}

const MainPage = () => {

  const contacts = useContactsStore(s => s.contacts)
  const deleteContacts = useContactsStore(s => s.deleteContacts)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceAutoRecord, setVoiceAutoRecord] = useState(false)
  const [voiceDraft, setVoiceDraft] = useState<TCreateContactData | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [deletingMany, setDeletingMany] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [sort, setSort] = useState({ column: '', order: 'asc' })

  const router = useRouter()

  useEffect(() => {
    setHasDraft(!!sessionStorage.getItem(DRAFT_KEY))
  }, [])

  const handleSort = (column: string, currentOrder: string) => {
    setSort({ column, order: currentOrder === 'asc' ? 'desc' : 'asc' })
  }

  const sortedContacts = useMemo(() => {
    if (!sort.column) return contacts
    return [...contacts].sort((a, b) => {
      const dir = sort.order === 'asc' ? 1 : -1
      if (sort.column === 'priority') {
        return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir
      }
      const aVal = a[sort.column as 'next_event_date' | 'last_contact'] ?? ''
      const bVal = b[sort.column as 'next_event_date' | 'last_contact'] ?? ''
      return aVal < bVal ? -dir : aVal > bVal ? dir : 0
    })
  }, [contacts, sort])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const openContact = useCallback((id: string) => {
    router.push(Pages.contact(id))
  }, [router])

  const handleDeleteSelected = async () => {
    if (!selected.size) return
    setDeletingMany(true)
    try {
      const { deleted } = await deleteContacts([...selected])
      setSelected(prev => {
        const next = new Set(prev)
        deleted.forEach(id => next.delete(id))
        return next
      })
    } finally {
      setDeletingMany(false)
      setConfirmDeleteOpen(false)
    }
  }

  const openVoiceModal = useCallback(() => {
    setVoiceDraft(null)
    setVoiceAutoRecord(true)
    setVoiceOpen(true)
  }, [])

  const openDraftModal = useCallback(() => {
    const draft = loadDraft()
    if (!draft) return
    setVoiceDraft(draft)
    setVoiceAutoRecord(false)
    setVoiceOpen(true)
  }, [])

  const openCreateModal = useCallback(() => {
    setVoiceDraft(null)
    setVoiceAutoRecord(false)
    setVoiceOpen(true)
  }, [])
  const openConfirmDeleteModal = useCallback(() => setConfirmDeleteOpen(true), [])

  const handleVoiceClose = () => {
    setVoiceOpen(false)
    setVoiceDraft(null)
    setVoiceAutoRecord(false)
    setHasDraft(!!sessionStorage.getItem(DRAFT_KEY))
  }

  return (
    <div className={c.page}>
      <div className="_container">

        <div className={c.top}>

          <h1 className="title">
            Контакты
          </h1>

          <MainToolbar
            selectedCount={selected.size}
            deletingMany={deletingMany}
            hasDraft={hasDraft}
            onDeleteClick={openConfirmDeleteModal}
            onDraftClick={openDraftModal}
            onCreateClick={openCreateModal}
            onVoiceClick={openVoiceModal}
          />
        </div>

        <div className={c.table_wrap}>
          <Table
            titles={{ titles: TITLES, sort, queryBySort: handleSort }}
            emptyData={contacts.length === 0}
            loading={false}
            emptyDataText="Контактов ещё нет. Добавьте первый!"
            tableClassName={c.contacts_table}
            columns={() => (
              <>
                {sortedContacts.map((contact, idx) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    index={idx}
                    selected={selected.has(contact.id)}
                    onToggleSelect={toggleSelect}
                    onOpen={openContact}
                  />
                ))}
              </>
            )}
          />
        </div>

      </div>

      <DeleteContactsModal
        active={confirmDeleteOpen}
        count={selected.size}
        deleting={deletingMany}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteSelected}
      />

      {voiceOpen &&
        <CreateContactModal
          onClose={handleVoiceClose}
          draft={voiceDraft ?? undefined}
          autoRecord={voiceAutoRecord}
        />
      }
    </div>
  )
}

export { MainPage }
