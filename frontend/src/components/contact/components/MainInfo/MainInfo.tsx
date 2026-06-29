import { Select, SelectDate, Input } from '@/shared/UI'
import { findConflict } from '@/shared/utils'
import { ConflictableField } from '@/components/contact/elements/ConflictableField/ConflictableField'
import { PRIORITY_OPTIONS, RELATION_OPTIONS } from '@/shared/types/contact.types'
import type { TContact, TContactPriority, TContactRelationLevel, TContactScrapingLog } from '@/shared/types/contact.types'

import c from './MainInfo.module.scss'


interface Props {
  contact: TContact
  set: <K extends keyof TContact>(field: K, value: TContact[K]) => void
  conflicts: TContactScrapingLog[]
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
}

const MainInfo = ({ contact, set, conflicts, resolvingKeys, onResolveConflict }: Props) => {

  const conflictFor = (field: string) => findConflict(conflicts, field)

  const formatBirthDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString('ru-RU') : ''

  return (
    <div className={c.section}>
      <p className={c.section_title}>Основная информация</p>

      <div className={c.fields_grid}>

        <div className={c.field}>
          <ConflictableField
            label="ФИО"
            field="full_name"
            conflict={conflictFor('full_name')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.full_name}
              onChange={e => set('full_name', e.target.value)}
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Должность"
            field="position"
            conflict={conflictFor('position')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.position ?? ''}
              onChange={e => set('position', e.target.value)}
              placeholder="—"
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Компания"
            field="company"
            conflict={conflictFor('company')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.company ?? ''}
              onChange={e => set('company', e.target.value)}
              placeholder="—"
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Направление деятельности"
            field="direction"
            conflict={conflictFor('direction')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <Input
              value={contact.direction ?? ''}
              onChange={e => set('direction', e.target.value)}
              placeholder="—"
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <ConflictableField
            label="Дата рождения"
            field="birth_date"
            mergeable={false}
            formatValue={formatBirthDate}
            conflict={conflictFor('birth_date')}
            resolvingKeys={resolvingKeys}
            onResolveConflict={onResolveConflict}
          >
            <SelectDate
              value={contact.birth_date}
              onChange={v => set('birth_date', v)}
            />
          </ConflictableField>
        </div>

        <div className={c.field}>
          <label>Последний контакт</label>
          <SelectDate
            value={contact.last_contact}
            onChange={v => set('last_contact', v)}
          />
        </div>

        <div className={c.field}>
          <label>Приоритет</label>
          <Select
            options={PRIORITY_OPTIONS}
            value={contact.priority}
            onChange={v => set('priority', v as TContactPriority)}
          />
        </div>

        <div className={c.field}>
          <label>Уровень отношений</label>
          <Select
            options={RELATION_OPTIONS}
            value={contact.relationship_level}
            onChange={v => set('relationship_level', v as TContactRelationLevel)}
          />
        </div>

      </div>
    </div>
  )
}

export { MainInfo }
