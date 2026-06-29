import type { TChatMessage } from './api.types'

export type TContactPriority = 'high' | 'medium' | 'low'
export type TContactRelationLevel = 'cold' | 'warm' | 'middle'

export type TImportantDate = {
  label: string
  date: string
}

export type TContactInfo = {
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

export type TContact = {
  id: string
  user_id: string
  full_name: string
  photo: string | null
  position: string | null
  company: string | null
  direction: string | null
  priority: TContactPriority
  relationship_level: TContactRelationLevel
  last_contact: string | null
  birth_date: string | null
  goals: string | null
  main_pain: string | null
  interests: string | null
  dream: string | null
  personal_traits: string | null
  useful_to_me: string | null
  useful_to_them: string | null
  contact_info: TContactInfo | null
  note: string | null
  important_dates: TImportantDate[]
  chat_history: TChatMessage[]
  recent_activity_summary: string | null
  recent_topics: string | null
  conversation_starters: string | null
  tg_activity_summary: string | null
  tg_recent_topics: string | null
  tg_conversation_starters: string | null
  company_about: string | null
  company_size: string | null
  company_founded: string | null
  company_target_audience: string | null
  company_market: string | null
  company_technologies: string | null
  company_revenue: string | null
  company_competitors: string | null
  company_requisites: string | null
  last_vk_analysis_at: string | null
  last_tg_analysis_at: string | null
  created_at: string
  next_event_date?: string | null
}

export type TScrapingPlatform = 'telegram' | 'vk' | 'website'
export type TScrapingSource = 'profile' | 'group' | null
export type TScrapingLogType = 'added' | 'conflict' | 'error' | 'no_changes'
export type TConflictResolution = 'changed' | 'skipped' | null

export type TLogChange = {
  field: string
  old_value: string | null
  new_value: string | null
  resolution?: TConflictResolution
}

export type TContactScrapingLog = {
  id: string
  contact_id: string
  platform: TScrapingPlatform
  source: TScrapingSource
  type: TScrapingLogType
  changes: TLogChange[]
  posts_analyzed: number | null
  message: string | null
  created_at: string
}

export const PRIORITY_LABEL: Record<TContactPriority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

export const RELATION_LABEL: Record<TContactRelationLevel, string> = {
  cold: 'Холодный',
  warm: 'Тёплый',
  middle: 'Средний',
}

export const PRIORITY_COLOR: Record<TContactPriority, string> = {
  high: 'var(--color-red)',
  medium: 'var(--color-orange)',
  low: 'var(--color-green)',
}

export const PRIORITY_OPTIONS: { value: TContactPriority; label: string }[] = [
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' },
]

export const RELATION_OPTIONS: { value: TContactRelationLevel; label: string }[] = [
  { value: 'cold', label: 'Холодный' },
  { value: 'warm', label: 'Тёплый' },
  { value: 'middle', label: 'Средний' },
]
