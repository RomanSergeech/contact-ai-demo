import { Input } from '@/shared/UI'
import { findConflict } from '@/shared/utils'
import { ConflictableField } from '@/components/contact/elements/ConflictableField/ConflictableField'
import type { TContactInfo, TContactScrapingLog } from '@/shared/types/contact.types'
import { EnrichButton } from '../EnrichButton/EnrichButton'

import c from './WebsiteFields.module.scss'


interface Props {
  contactInfo: TContactInfo
  setContactInfo: <K extends keyof TContactInfo>(field: K, value: TContactInfo[K]) => void
  personalLoading: boolean
  companyLoading: boolean
  busy: boolean
  enrichedPersonal: boolean
  enrichedCompany: boolean
  conflicts: TContactScrapingLog[]
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
  onScrapePersonal: () => void
  onScrapeCompany: () => void
}

const WebsiteFields = ({
  contactInfo,
  setContactInfo,
  personalLoading,
  companyLoading,
  busy,
  enrichedPersonal,
  enrichedCompany,
  conflicts,
  resolvingKeys,
  onResolveConflict,
  onScrapePersonal,
  onScrapeCompany,
}: Props) => {

  const conflictFor = (field: string) => findConflict(conflicts, field)

  return (
    <div className={c.field_group}>
      <span className={c.field_group_label}>Сайты</span>

      <div className={c.field}>
        <ConflictableField
          label="Личный сайт"
          field="contact_info.personal_site"
          mergeable={false}
          conflict={conflictFor('contact_info.personal_site')}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
        >
          <div className={c.input_with_action}>
            <Input
              value={contactInfo.personal_site}
              onChange={e => setContactInfo('personal_site', e.target.value)}
              placeholder="https://example.com"
            />
            <EnrichButton
              loading={personalLoading}
              disabled={!contactInfo.personal_site || busy}
              enriched={enrichedPersonal}
              title="Заполнить из личного сайта"
              onClick={onScrapePersonal}
            />
          </div>
        </ConflictableField>
      </div>

      <div className={c.field}>
        <ConflictableField
          label="Сайт компании"
          field="contact_info.company_site"
          mergeable={false}
          conflict={conflictFor('contact_info.company_site')}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
        >
          <div className={c.input_with_action}>
            <Input
              value={contactInfo.company_site}
              onChange={e => setContactInfo('company_site', e.target.value)}
              placeholder="https://company.com"
            />
            <EnrichButton
              loading={companyLoading}
              disabled={!contactInfo.company_site || busy}
              enriched={enrichedCompany}
              title="Заполнить из сайта компании"
              onClick={onScrapeCompany}
            />
          </div>
        </ConflictableField>
      </div>
    </div>
  )
}

export { WebsiteFields }
