'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useContactsStore } from '@/shared/store'
import { Modal, Button, Input, Textarea, Select, SelectDate } from '@/shared/UI'
import { Pages } from '@/shared/config/pages.config'
import { AiService } from '@/shared/api'
import { PRIORITY_OPTIONS, RELATION_OPTIONS } from '@/shared/types/contact.types'
import type { TContactPriority, TContactRelationLevel, TImportantDate } from '@/shared/types/contact.types'

import c from './CreateContactModal.module.scss'


export const DRAFT_KEY = 'voice_contact_draft'

export interface TCreateContactData {
  full_name: string
  position: string
  company: string
  direction: string
  priority: TContactPriority
  relationship_level: TContactRelationLevel
  goals: string
  main_pain: string
  interests: string
  dream: string
  personal_traits: string
  useful_to_me: string
  useful_to_them: string
  last_contact: string
  birth_date: string
  important_dates: TImportantDate[]
  phone: string
  email: string
  telegram_profile: string
  telegram_group: string
  whatsapp: string
  instagram: string
  vk_profile: string
  vk_group: string
  personal_site: string
  company_site: string
}

const EMPTY: TCreateContactData = {
  full_name: '', position: '', company: '', direction: '',
  priority: 'medium', relationship_level: 'cold',
  goals: '', main_pain: '', interests: '', dream: '',
  personal_traits: '', useful_to_me: '', useful_to_them: '',
  last_contact: '',
  birth_date: '',
  important_dates: [],
  phone: '', email: '',
  telegram_profile: '', telegram_group: '',
  whatsapp: '', instagram: '',
  vk_profile: '', vk_group: '',
  personal_site: '', company_site: '',
}

interface Props {
  onClose: () => void
  draft?: TCreateContactData
  autoRecord?: boolean
}

const CreateContactModal = ({ onClose, draft, autoRecord = !draft }: Props) => {

  const createContact = useContactsStore(s => s.createContact)

  const [data, setData] = useState<TCreateContactData>(draft ?? EMPTY)
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(autoRecord)
  const [isParsing, setIsParsing] = useState(false)
  const [transcript, setTranscript] = useState('')

  const router = useRouter()

  const finalRef = useRef('')
  const isAdditionRef = useRef(false)
  const isRecordingRef = useRef(autoRecord)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (autoRecord) {
      isRecordingRef.current = true
      startRecording()
    }
    return () => {
      isRecordingRef.current = false
      recognitionRef.current?.stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      alert('Голосовой ввод поддерживается только в Chrome и Edge')
      onClose()
      return
    }

    finalRef.current = ''
    setTranscript('')

    const rec = new SR()
    rec.lang = 'ru-RU'
    rec.interimResults = true
    rec.continuous = true
    recognitionRef.current = rec

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalRef.current += e.results[i][0].transcript + ' '
        } else {
          interim += e.results[i][0].transcript
        }
      }
      setTranscript(finalRef.current + interim)
    }

    rec.onerror = () => {}

    rec.onend = () => {
      // iOS Safari останавливается после каждой паузы — перезапускаем, если запись ещё активна
      if (isRecordingRef.current) {
        try { rec.start() } catch { /* уже запущено */ }
      }
    }

    rec.start()
  }

  const startAdditionalRecording = () => {
    isAdditionRef.current = true
    isRecordingRef.current = true
    setIsRecording(true)
    startRecording()
  }

  const stopAndParse = async () => {
    isRecordingRef.current = false
    recognitionRef.current?.stop()
    const wasAddition = isAdditionRef.current
    isAdditionRef.current = false
    setIsRecording(false)

    const text = finalRef.current.trim() || transcript.trim()
    if (!text) return

    const abort = new AbortController()
    abortRef.current = abort

    setIsParsing(true)
    try {
      const { data: parsed } = await AiService.parseContactFromVoice(text, abort.signal)

      const cap = (s: string | null | undefined) => {
        if (!s?.trim()) return ''
        const v = s.trim()
        return v.charAt(0).toUpperCase() + v.slice(1)
      }

      const raw = (s: string | null | undefined) => s?.trim() ?? ''

      if (wasAddition) {
        setData(prev => {
          const str = (newVal: string | null, existing: string) =>
            newVal?.trim() ? cap(newVal) : existing
          const strRaw = (newVal: string | null | undefined, existing: string) =>
            newVal?.trim() ? newVal.trim() : existing

          const existingKeys = new Set(prev.important_dates.map(d => `${d.label}|${d.date}`))
          const newDates = (parsed.important_dates ?? [])
            .filter(d => !existingKeys.has(`${d.label}|${d.date}`))
            .map(d => ({ label: cap(d.label), date: d.date }))

          const cd = parsed.contact_details

          return {
            full_name: str(parsed.full_name, prev.full_name),
            position: str(parsed.position, prev.position),
            company: str(parsed.company, prev.company),
            direction: str(parsed.direction, prev.direction),
            priority: prev.priority,
            relationship_level: prev.relationship_level,
            goals: str(parsed.goals, prev.goals),
            main_pain: str(parsed.main_pain, prev.main_pain),
            interests: str(parsed.interests, prev.interests),
            dream: str(parsed.dream, prev.dream),
            personal_traits: str(parsed.personal_traits, prev.personal_traits),
            useful_to_me: str(parsed.useful_to_me, prev.useful_to_me),
            useful_to_them: str(parsed.useful_to_them, prev.useful_to_them),
            last_contact: strRaw(parsed.last_contact, prev.last_contact),
            birth_date: strRaw(parsed.birth_date, prev.birth_date),
            important_dates: [...prev.important_dates, ...newDates],
            phone: strRaw(cd?.phone, prev.phone),
            email: strRaw(cd?.email, prev.email),
            telegram_profile: strRaw(cd?.telegram_profile, prev.telegram_profile),
            telegram_group: strRaw(cd?.telegram_group, prev.telegram_group),
            whatsapp: strRaw(cd?.whatsapp, prev.whatsapp),
            instagram: strRaw(cd?.instagram, prev.instagram),
            vk_profile: strRaw(cd?.vk_profile, prev.vk_profile),
            vk_group: strRaw(cd?.vk_group, prev.vk_group),
            personal_site: strRaw(cd?.personal_site, prev.personal_site),
            company_site: strRaw(cd?.company_site, prev.company_site),
          }
        })
      } else {
        const cd = parsed.contact_details
        setData({
          full_name: cap(parsed.full_name),
          position: cap(parsed.position),
          company: cap(parsed.company),
          direction: cap(parsed.direction),
          priority: (parsed.priority as TContactPriority) ?? 'medium',
          relationship_level: (parsed.relationship_level as TContactRelationLevel) ?? 'cold',
          goals: cap(parsed.goals),
          main_pain: cap(parsed.main_pain),
          interests: cap(parsed.interests),
          dream: cap(parsed.dream),
          personal_traits: cap(parsed.personal_traits),
          useful_to_me: cap(parsed.useful_to_me),
          useful_to_them: cap(parsed.useful_to_them),
          last_contact: raw(parsed.last_contact),
          birth_date: raw(parsed.birth_date),
          important_dates: (parsed.important_dates ?? []).map(d => ({ label: cap(d.label), date: d.date })),
          phone: raw(cd?.phone),
          email: raw(cd?.email),
          telegram_profile: raw(cd?.telegram_profile),
          telegram_group: raw(cd?.telegram_group),
          whatsapp: raw(cd?.whatsapp),
          instagram: raw(cd?.instagram),
          vk_profile: raw(cd?.vk_profile),
          vk_group: raw(cd?.vk_group),
          personal_site: raw(cd?.personal_site),
          company_site: raw(cd?.company_site),
        })
      }
    } catch {
      isRecordingRef.current = true
      setIsRecording(true)
      startRecording()
    } finally {
      setIsParsing(false)
    }
  }

  const handleClose = () => {
    abortRef.current?.abort()
    recognitionRef.current?.stop()
    if (data.full_name.trim()) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    }
    onClose()
  }

  const set = <K extends keyof TCreateContactData>(key: K, value: TCreateContactData[K]) =>
    setData(prev => ({ ...prev, [key]: value }))

  const setDate = (idx: number, field: keyof TImportantDate, value: string) =>
    setData(prev => {
      const dates = prev.important_dates.map((d, i) => i === idx ? { ...d, [field]: value } : d)
      return { ...prev, important_dates: dates }
    })

  const addDate = () =>
    setData(prev => ({ ...prev, important_dates: [...prev.important_dates, { label: '', date: '' }] }))

  const removeDate = (idx: number) =>
    setData(prev => ({ ...prev, important_dates: prev.important_dates.filter((_, i) => i !== idx) }))

  const handleCreate = async () => {
    if (!data.full_name.trim()) return
    setLoading(true)
    try {
      const contactInfo = {
        phone: data.phone.trim(),
        email: data.email.trim(),
        telegram_profile: data.telegram_profile.trim(),
        telegram_group: data.telegram_group.trim(),
        whatsapp: data.whatsapp.trim(),
        instagram: data.instagram.trim(),
        vk_profile: data.vk_profile.trim(),
        vk_group: data.vk_group.trim(),
        personal_site: data.personal_site.trim(),
        company_site: data.company_site.trim(),
      }
      const hasContactInfo = Object.values(contactInfo).some(v => v)

      const contact = await createContact({
        full_name: data.full_name.trim(),
        position: data.position.trim() || null,
        company: data.company.trim() || null,
        direction: data.direction.trim() || null,
        priority: data.priority,
        relationship_level: data.relationship_level,
        goals: data.goals.trim() || null,
        main_pain: data.main_pain.trim() || null,
        interests: data.interests.trim() || null,
        dream: data.dream.trim() || null,
        personal_traits: data.personal_traits.trim() || null,
        useful_to_me: data.useful_to_me.trim() || null,
        useful_to_them: data.useful_to_them.trim() || null,
        last_contact: data.last_contact.trim() || null,
        birth_date: data.birth_date.trim() || null,
        important_dates: data.important_dates.filter(d => d.label.trim() && d.date.trim()),
        contact_info: hasContactInfo ? contactInfo : null,
      })
      sessionStorage.removeItem(DRAFT_KEY)
      onClose()
      router.push(Pages.contact(contact.id))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      active={true}
      title="Проверьте данные"
      onClose={handleClose}
      maxWidth={580}
      disableOverlayClose
    >

        <div className={c.review_body}>

          {isRecording && (
            <div className={c.transcript_popup}>
              <div className={c.transcript_popup_header}>
                <span className={c.rec_dot} />
                <span>Идёт запись</span>
              </div>
              <p className={transcript ? c.transcript_popup_text : `${c.transcript_popup_text} ${c.transcript_popup_text_empty}`}>
                {transcript || 'Говорите...'}
              </p>
            </div>
          )}

          <div className={c.field}>
            <label>ФИО <span className={c.required}>*</span></label>
            <Input
              value={data.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Имя Фамилия"
            />
          </div>

          <div className={c.row}>
            <div className={c.field}>
              <label>Должность</label>
              <Input
                value={data.position}
                onChange={e => set('position', e.target.value)}
                placeholder="—"
              />
            </div>
            <div className={c.field}>
              <label>Компания</label>
              <Input
                value={data.company}
                onChange={e => set('company', e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className={c.row}>
            <div className={c.field}>
              <label>Приоритет</label>
              <Select
                options={PRIORITY_OPTIONS}
                value={data.priority}
                onChange={v => set('priority', v as TContactPriority)}
              />
            </div>
            <div className={c.field}>
              <label>Уровень отношений</label>
              <Select
                options={RELATION_OPTIONS}
                value={data.relationship_level}
                onChange={v => set('relationship_level', v as TContactRelationLevel)}
              />
            </div>
          </div>

          <div className={c.field}>
            <label>Направление деятельности</label>
            <Input
              value={data.direction}
              onChange={e => set('direction', e.target.value)}
              placeholder="—"
            />
          </div>

          <div className={c.row}>
            <div className={c.field}>
              <label>Дата рождения</label>
              <SelectDate
                value={data.birth_date || null}
                onChange={v => set('birth_date', v ?? '')}
              />
            </div>
            <div className={c.field}>
              <label>Последний контакт</label>
              <SelectDate
                value={data.last_contact || null}
                onChange={v => set('last_contact', v ?? '')}
              />
            </div>
          </div>

          {[
            { key: 'goals' as const, label: 'Цели' },
            { key: 'main_pain' as const, label: 'Главная боль' },
            { key: 'interests' as const, label: 'Интересы' },
            { key: 'dream' as const, label: 'Мечта' },
            { key: 'personal_traits' as const, label: 'Личные характеристики' },
            { key: 'useful_to_me' as const, label: 'Чем может быть полезен мне' },
            { key: 'useful_to_them' as const, label: 'Чем я могу быть полезен' },
          ].map(({ key, label }) => (
            <div key={key} className={c.field}>
              <label>{label}</label>
              <Textarea
                value={data[key] as string}
                onChange={e => set(key, e.target.value)}
                placeholder="—"
                rows={2}
                autoResize
              />
            </div>
          ))}

          {/* ── Контактные данные ── */}
          <div className={c.contact_info_section}>
            <span className={c.section_label}>Контактные данные</span>

            <div className={c.row}>
              <div className={c.field}>
                <label>Телефон</label>
                <Input
                  value={data.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className={c.field}>
                <label>Email</label>
                <Input
                  value={data.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>

            <div className={c.row}>
              <div className={c.field}>
                <label>WhatsApp</label>
                <Input
                  value={data.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className={c.field}>
                <label>Instagram</label>
                <Input
                  value={data.instagram}
                  onChange={e => set('instagram', e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>

            <div className={c.row}>
              <div className={c.field}>
                <label>Telegram профиль</label>
                <Input
                  value={data.telegram_profile}
                  onChange={e => set('telegram_profile', e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className={c.field}>
                <label>Telegram группа</label>
                <Input
                  value={data.telegram_group}
                  onChange={e => set('telegram_group', e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>

            <div className={c.row}>
              <div className={c.field}>
                <label>VK профиль</label>
                <Input
                  value={data.vk_profile}
                  onChange={e => set('vk_profile', e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className={c.field}>
                <label>VK группа</label>
                <Input
                  value={data.vk_group}
                  onChange={e => set('vk_group', e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          {/* ── Важные даты ── */}
          <div className={c.dates_section}>
            <div className={c.dates_header}>
              <span className={c.dates_label}>Важные даты</span>
              <Button
                type="button"
                variant="text"
                className={c.add_date_btn}
                onClick={addDate}
              >
                + Добавить
              </Button>
            </div>

            {data.important_dates.length === 0 && (
              <p className={c.dates_empty}>Не распознано. Можно добавить вручную.</p>
            )}

            {data.important_dates.map((d, idx) => (
              <div key={idx} className={c.date_row}>
                <Input
                  value={d.label}
                  onChange={e => setDate(idx, 'label', e.target.value)}
                  placeholder="Название (напр. Годовщина)"
                />
                <SelectDate
                  value={d.date || null}
                  onChange={v => setDate(idx, 'date', v ?? '')}
                />
                <Button
                  type="button"
                  variant="danger"
                  iconOnly
                  aria-label="Удалить"
                  className={c.remove_date_btn}
                  onClick={() => removeDate(idx)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </Button>
              </div>
            ))}
          </div>

        </div>

        <div className={c.footer}>
          <div className={c.footer_left}>
            {isRecording ? (
              <button
                className={c.stop_strip_btn}
                onClick={stopAndParse}
                type="button"
              >
                Стоп
              </button>
            ) : isParsing ? (
              <div className={c.recording_strip}>
                <span className={c.spinner_sm} />
                <span className={c.recording_strip_text_muted}>Обработка...</span>
              </div>
            ) : (
              <Button
                type="button"
                variant="surface"
                iconOnly
                className={c.mic_btn}
                onClick={startAdditionalRecording}
                title="Дозаполнить голосом"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/>
                  <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Button>
            )}
          </div>
          <div className={c.footer_right}>
            <Button
              variant="ghost"
              onClick={handleClose}
              className={c.cancel_btn}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!data.full_name.trim() || loading || isParsing}
            >
              {loading ? 'Создание...' : 'Создать контакт'}
            </Button>
          </div>
        </div>

    </Modal>
  )
}

export { CreateContactModal }
