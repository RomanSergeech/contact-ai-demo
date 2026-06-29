import { Input, Textarea } from '@/shared/UI'
import { findConflict } from '@/shared/utils'
import { ConflictableField } from '@/components/contact/elements/ConflictableField/ConflictableField'
import type { TContact, TContactScrapingLog } from '@/shared/types/contact.types'

import c from './CompanyInfo.module.scss'


interface Props {
  contact: TContact
  set: <K extends keyof TContact>(field: K, value: TContact[K]) => void
  conflicts: TContactScrapingLog[]
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
}

const CompanyInfo = ({ contact, set, conflicts, resolvingKeys, onResolveConflict }: Props) => {

  const conflictFor = (field: string) => findConflict(conflicts, field)

  return (
    <div className={c.section}>
      <p className={c.section_title}>О компании</p>
      <div className={c.fields_grid}>

        <div className={c.field} data-full>
          <ConflictableField
            label="О нас"
            field="company_about"
            multiline
            conflict={conflictFor('company_about')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Textarea
              autoResize
              className={c.field_textarea}
              value={contact.company_about ?? ''}
              onChange={e => set('company_about', e.target.value)}
              placeholder="Краткое описание компании..."
              rows={2}
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Год основания"
            field="company_founded"
            mergeable={false}
            conflict={conflictFor('company_founded')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.company_founded ?? ''}
              onChange={e => set('company_founded', e.target.value)}
              placeholder="2015"
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Размер"
            field="company_size"
            mergeable={false}
            conflict={conflictFor('company_size')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.company_size ?? ''}
              onChange={e => set('company_size', e.target.value)}
              placeholder="50-200 сотрудников"
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Рынок"
            field="company_market"
            mergeable={false}
            conflict={conflictFor('company_market')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.company_market ?? ''}
              onChange={e => set('company_market', e.target.value)}
              placeholder="B2B, Россия и СНГ"
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Выручка / стадия"
            field="company_revenue"
            mergeable={false}
            conflict={conflictFor('company_revenue')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.company_revenue ?? ''}
              onChange={e => set('company_revenue', e.target.value)}
              placeholder="Series A, ~$5M ARR"
            />
          </ConflictableField>
        </div>

        <div className={c.field} data-full>
          <ConflictableField
            label="Целевая аудитория"
            field="company_target_audience"
            multiline
            conflict={conflictFor('company_target_audience')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Textarea
              autoResize
              className={c.field_textarea}
              value={contact.company_target_audience ?? ''}
              onChange={e => set('company_target_audience', e.target.value)}
              placeholder="Кому продают..."
              rows={2}
            />
          </ConflictableField>
        </div>

        <div className={c.field} data-full>
          <ConflictableField
            label="Технологии"
            field="company_technologies"
            multiline
            conflict={conflictFor('company_technologies')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Textarea
              autoResize
              className={c.field_textarea}
              value={contact.company_technologies ?? ''}
              onChange={e => set('company_technologies', e.target.value)}
              placeholder="Стек, инструменты..."
              rows={2}
            />
          </ConflictableField>
        </div>

        <div className={c.field} data-full>
          <ConflictableField
            label="Конкуренты"
            field="company_competitors"
            multiline
            conflict={conflictFor('company_competitors')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Textarea
              autoResize
              className={c.field_textarea}
              value={contact.company_competitors ?? ''}
              onChange={e => set('company_competitors', e.target.value)}
              placeholder="Конкурирующие компании..."
              rows={2}
            />
          </ConflictableField>
        </div>

        <div className={c.field} data-full>
          <ConflictableField
            label="Реквизиты"
            field="company_requisites"
            multiline
            conflict={conflictFor('company_requisites')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Textarea
              autoResize
              className={c.field_textarea}
              value={contact.company_requisites ?? ''}
              onChange={e => set('company_requisites', e.target.value)}
              placeholder="ИНН, КПП, ОГРН, юр. адрес..."
              rows={3}
            />
          </ConflictableField>
        </div>

      </div>
    </div>
  )
}

export { CompanyInfo }
