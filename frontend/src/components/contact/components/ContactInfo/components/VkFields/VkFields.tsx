import { Input } from '@/shared/UI'
import { findConflict } from '@/shared/utils'
import { ConflictableField } from '@/components/contact/elements/ConflictableField/ConflictableField'
import type { TContactInfo, TContactScrapingLog } from '@/shared/types/contact.types'
import { EnrichButton } from '../EnrichButton/EnrichButton'

import c from './VkFields.module.scss'


interface Props {
  contactInfo: TContactInfo
  setContactInfo: <K extends keyof TContactInfo>(field: K, value: TContactInfo[K]) => void
  connected: boolean
  profileLoading: boolean
  profileBusy: boolean
  groupLoading: boolean
  groupBusy: boolean
  profileEnriched: boolean
  groupEnriched: boolean
  lastVkAnalysisAt: string | null
  conflicts: TContactScrapingLog[]
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
  onScrapeProfile: () => void
  onAnalyzeGroup: () => void
}

const VkFields = ({
  contactInfo,
  setContactInfo,
  connected,
  profileLoading,
  profileBusy,
  groupLoading,
  groupBusy,
  profileEnriched,
  groupEnriched,
  lastVkAnalysisAt,
  conflicts,
  resolvingKeys,
  onResolveConflict,
  onScrapeProfile,
  onAnalyzeGroup,
}: Props) => {

  const conflictFor = (field: string) => findConflict(conflicts, field)

  return (
    <div className={c.field_group}>
      <span className={c.field_group_label}>Vk</span>

      <div className={c.field}>
        <ConflictableField
          label="Личная страница"
          field="contact_info.vk_profile"
          mergeable={false}
          conflict={conflictFor('contact_info.vk_profile')}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
        >
          <div className={c.input_with_action}>
            <Input
              value={contactInfo.vk_profile}
              onChange={e => setContactInfo('vk_profile', e.target.value)}
              placeholder="https://vk.com/id123456"
            />
            <EnrichButton
              loading={profileLoading}
              disabled={!contactInfo.vk_profile || profileBusy}
              enriched={profileEnriched}
              title={connected ? 'Заполнить из VK-профиля и проанализировать посты за последнюю неделю' : 'Подключить VK'}
              onClick={onScrapeProfile}
            />
          </div>
        </ConflictableField>
      </div>

      <div className={c.field}>
        <ConflictableField
          label="Группа"
          field="contact_info.vk_group"
          mergeable={false}
          conflict={conflictFor('contact_info.vk_group')}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
        >
          <div className={c.input_with_action}>
            <Input
              value={contactInfo.vk_group}
              onChange={e => setContactInfo('vk_group', e.target.value)}
              placeholder="https://vk.com/groupname"
            />
            <EnrichButton
              loading={groupLoading}
              disabled={!contactInfo.vk_group || groupBusy}
              enriched={groupEnriched}
              title="Проанализировать посты со стены группы за последнюю неделю"
              onClick={onAnalyzeGroup}
            />
          </div>
        </ConflictableField>
      </div>

      {lastVkAnalysisAt && (
        <p className={c.analyze_hint}>
          Последний анализ активности: {new Date(lastVkAnalysisAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
        </p>
      )}
    </div>
  )
}

export { VkFields }
