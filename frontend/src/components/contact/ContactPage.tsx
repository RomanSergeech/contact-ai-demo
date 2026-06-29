'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useContactsStore } from '@/shared/store'
import { AiChat } from '@/widgets/ai-chat/AiChat'
import { parseContactInfo } from '@/shared/utils'
import type { TContact, TContactScrapingLog } from '@/shared/types/contact.types'
import type { TEnrichFromSocialResponse, TAnalyzeActivityResponse } from '@/shared/types/api.types'
import { Sidebar, MainInfo, ContactInfo, Profile, ImportantDates, CompanyInfo, ActionBar, LogsSection } from './components'

import c from './page.module.scss'


interface Props {
  id: string
}

const ContactPage = ({ id }: Props) => {

  const contacts = useContactsStore(s => s.contacts)
  const updateContact = useContactsStore(s => s.updateContact)
  const fetchContactById = useContactsStore(s => s.fetchContactById)
  const fetchLogs = useContactsStore(s => s.fetchLogs)
  const resolveLog = useContactsStore(s => s.resolveLog)

  const stored = contacts.find(c => c.id === id)

  const [contact, setContact] = useState<TContact | null>(stored ?? null)
  const [logs, setLogs] = useState<TContactScrapingLog[]>([])
  const [resolvingKeys, setResolvingKeys] = useState<Set<string>>(new Set())
  const [isScraping, setIsScraping] = useState(false)

  const router = useRouter()

  useEffect(() => {
    if (!stored) {
      fetchContactById(id)
        .then(data => setContact(data))
        .catch(() => router.replace('/main'))
    } else {
      setContact(stored)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    fetchLogs(id).then(data => setLogs(data)).catch(() => {})
  }, [id])

  if (!contact) return (
    <div className={c.page}>
      <div className="_container">
        <p className={c.loading}>Загрузка...</p>
      </div>
    </div>
  )

  const set = <K extends keyof TContact>(field: K, value: TContact[K]) =>
    setContact(prev => prev ? { ...prev, [field]: value } : prev)

  const handleSave = async () => {
    if (JSON.stringify(contact) === JSON.stringify(stored)) return
    const { id, user_id, created_at, next_event_date, chat_history, last_vk_analysis_at, last_tg_analysis_at, ...updates } = contact

    await updateContact(id, { ...updates, contact_info: parseContactInfo(updates.contact_info) })
  }

  const conflicts = (logs ?? []).filter(l => l.type === 'conflict')

  const pruneOldConflicts = (incoming: TContactScrapingLog[], prev: TContactScrapingLog[]): TContactScrapingLog[] => {
    const incomingFields = new Set(
      incoming
        .filter(l => l.type === 'conflict')
        .flatMap(l => l.changes.filter(c => !c.resolution).map(c => c.field))
    )
    if (!incomingFields.size) return prev
    return prev.filter(l =>
      l.type !== 'conflict' ||
      !l.changes.some(c => !c.resolution && incomingFields.has(c.field))
    )
  }

  const handleEnrichResult = (result: TEnrichFromSocialResponse) => {
    setContact(result.contact)
    setLogs(prev => [...result.logs, ...pruneOldConflicts(result.logs, prev)])
  }

  const handleActivityResult = (result: TAnalyzeActivityResponse) => {
    setContact(result.contact)
    setLogs(prev => [...result.logs, ...pruneOldConflicts(result.logs, prev)])
  }

  const handleResolveConflict = async (logId: string, field: string, choice: 'old' | 'new' | 'merge') => {
    const key = `${logId}_${field}`
    setResolvingKeys(prev => new Set(prev).add(key))
    try {
      const data = await resolveLog(id, logId, field, choice)
      setContact(data.contact)
      const resolution = choice === 'old' ? 'skipped' as const : 'changed' as const
      setLogs(prev => prev.map(l => {
        if (l.id !== logId) return l
        const base = data.log ?? l
        return {
          ...base,
          changes: base.changes.map(c =>
            c.field === field && !c.resolution ? { ...c, resolution } : c
          ),
        }
      }))
    } catch {
      // ошибка уже показана через onError стора
    } finally {
      setResolvingKeys(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className={c.page}>
      <div className="_container">

        <button
          className={c.back_btn}
          onClick={() => router.push('/main')}
          title="Назад к контактам"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Контакты
        </button>

        <div className={c.layout}>

          <Sidebar contact={contact} set={set} />

          <div className={c.content}>

            <MainInfo
              contact={contact}
              set={set}
              conflicts={conflicts}
              resolvingKeys={resolvingKeys}
              onResolveConflict={handleResolveConflict}
            />

            <ContactInfo
              contact={contact}
              set={set}
              conflicts={conflicts}
              resolvingKeys={resolvingKeys}
              onResolveConflict={handleResolveConflict}
              onEnrichResult={handleEnrichResult}
              onActivityResult={handleActivityResult}
              onScrapingChange={setIsScraping}
              onSave={handleSave}
            />

            <Profile
              contact={contact}
              set={set}
              conflicts={conflicts}
              resolvingKeys={resolvingKeys}
              onResolveConflict={handleResolveConflict}
            />

            <ImportantDates contact={contact} set={set} />

            <CompanyInfo
              contact={contact}
              set={set}
              conflicts={conflicts}
              resolvingKeys={resolvingKeys}
              onResolveConflict={handleResolveConflict}
            />

            <LogsSection logs={logs} />

            <ActionBar contact={contact} isScraping={isScraping} />

          </div>
        </div>

      </div>

      <AiChat
        contactId={contact.id}
        contactName={contact.full_name}
      />

    </div>
  )
}

export { ContactPage }
