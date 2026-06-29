export type TScrapingPlatform   = 'telegram' | 'vk' | 'website'
export type TScrapingSource     = 'profile' | 'group' | null
export type TScrapingLogType    = 'added' | 'conflict' | 'error' | 'no_changes'
export type TConflictResolution = 'changed' | 'skipped' | null

export type TLogChange = {
  field:      string
  old_value:  string | null
  new_value:  string | null
  resolution?: TConflictResolution
}

export type TContactScrapingLog = {
  id:             string
  contact_id:     string
  user_id:        string
  platform:       TScrapingPlatform
  source:         TScrapingSource
  type:           TScrapingLogType
  changes:        TLogChange[]
  posts_analyzed: number | null
  message:        string | null
  created_at:     string
}

export type TNewContactScrapingLog = {
  contact_id:     string
  user_id:        string
  platform:       TScrapingPlatform
  source?:        TScrapingSource
  type:           TScrapingLogType
  changes?:       TLogChange[]
  posts_analyzed?: number | null
  message?:       string | null
}
