import { Input } from '@/shared/UI'
import { findConflict } from '@/shared/utils'
import { ConflictableField } from '@/components/contact/elements/ConflictableField/ConflictableField'
import type { TContactInfo, TContactScrapingLog } from '@/shared/types/contact.types'
import { EnrichButton } from '../EnrichButton/EnrichButton'

import c from './TelegramField.module.scss'


interface Props {
  contactInfo: TContactInfo
  setContactInfo: <K extends keyof TContactInfo>(field: K, value: TContactInfo[K]) => void
  connected: boolean
  profileLoading: boolean
  profileBusy: boolean
  groupLoading: boolean
  groupBusy: boolean
  enrichedProfile: boolean
  enrichedGroup: boolean
  lastTgAnalysisAt: string | null
  conflicts: TContactScrapingLog[]
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
  onScrapeProfile: () => void
  onEnrichGroup: () => void
}

const TelegramFields = ({
  contactInfo,
  setContactInfo,
  connected,
  profileLoading,
  profileBusy,
  groupLoading,
  groupBusy,
  enrichedProfile,
  enrichedGroup,
  lastTgAnalysisAt,
  conflicts,
  resolvingKeys,
  onResolveConflict,
  onScrapeProfile,
  onEnrichGroup,
}: Props) => {

  const conflictFor = (field: string) => findConflict(conflicts, field)

  return (
    <div className={c.field_group}>
      <span className={c.field_group_label}>Telegram</span>

      <div className={c.field}>
        <ConflictableField
          label="Личная страница"
          field="contact_info.telegram_profile"
          mergeable={false}
          conflict={conflictFor('contact_info.telegram_profile')}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
        >
          <div className={c.input_with_action}>
            <Input
              value={contactInfo.telegram_profile}
              onChange={e => setContactInfo('telegram_profile', e.target.value)}
              placeholder="https://t.me/username"
            />
            <EnrichButton
              loading={profileLoading}
              disabled={!contactInfo.telegram_profile || profileBusy}
              enriched={enrichedProfile}
              title={connected ? 'Заполнить из Telegram-профиля' : 'Подключить Telegram'}
              onClick={onScrapeProfile}
            />
          </div>
        </ConflictableField>
      </div>

      <div className={c.field}>
        <ConflictableField
          label="Канал"
          field="contact_info.telegram_group"
          mergeable={false}
          conflict={conflictFor('contact_info.telegram_group')}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
        >
          <div className={c.input_with_action}>
            <Input
              value={contactInfo.telegram_group}
              onChange={e => setContactInfo('telegram_group', e.target.value)}
              placeholder="https://t.me/groupname"
            />
            <EnrichButton
              loading={groupLoading}
              disabled={!contactInfo.telegram_group || groupBusy}
              enriched={enrichedGroup}
              title={connected ? 'Заполнить из Telegram-группы/канала' : 'Подключить Telegram'}
              onClick={onEnrichGroup}
            />
          </div>
        </ConflictableField>
      </div>

      {lastTgAnalysisAt && (
        <p className={c.analyze_hint}>
          Последний анализ активности: {new Date(lastTgAnalysisAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
        </p>
      )}
    </div>
  )
}

export { TelegramFields }
