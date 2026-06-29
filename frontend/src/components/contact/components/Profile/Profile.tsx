import { Textarea } from '@/shared/UI'
import { findConflict } from '@/shared/utils'
import { ConflictableField } from '@/components/contact/elements/ConflictableField/ConflictableField'
import type { TContact, TContactScrapingLog } from '@/shared/types/contact.types'

import c from './Profile.module.scss'


type TProfileKey =
  | 'goals' | 'main_pain' | 'interests' | 'dream' | 'personal_traits'
  | 'useful_to_me' | 'useful_to_them' | 'conversation_starters'
  | 'recent_activity_summary' | 'recent_topics'
  | 'tg_activity_summary' | 'tg_recent_topics'

const FIELDS: { key: TProfileKey; label: string; placeholder: string }[] = [
  { key: 'goals',                   label: 'Цели',                                      placeholder: 'Чего хочет достичь...' },
  { key: 'main_pain',               label: 'Главная боль',                              placeholder: 'Основная проблема или боль...' },
  { key: 'interests',               label: 'Интересы',                                  placeholder: 'Хобби, увлечения...' },
  { key: 'dream',                   label: 'Мечта',                                     placeholder: 'О чём мечтает...' },
  { key: 'personal_traits',         label: 'Личные характеристики',                     placeholder: 'Характер, особенности...' },
  { key: 'useful_to_me',            label: 'Чем может быть полезен мне',                placeholder: '...' },
  { key: 'useful_to_them',          label: 'Чем я могу быть полезен',                   placeholder: '...' },
  { key: 'conversation_starters',   label: 'Поводы для разговора',                      placeholder: 'Готовые поводы на основе активности...' },
  { key: 'recent_activity_summary', label: 'Активность за последнюю неделю (VK)',        placeholder: 'Чем занимался по данным постов...' },
  { key: 'recent_topics',           label: 'Темы и интересы из постов (VK)',             placeholder: 'Темы, увлечения, события...' },
  { key: 'tg_activity_summary',     label: 'Активность за последнюю неделю (Telegram)',  placeholder: 'Чем занимался по данным постов...' },
  { key: 'tg_recent_topics',        label: 'Темы и интересы из постов (Telegram)',       placeholder: 'Темы, увлечения, события...' },
]


interface Props {
  contact: TContact
  set: <K extends keyof TContact>(field: K, value: TContact[K]) => void
  conflicts: TContactScrapingLog[]
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
}

const Profile = ({ contact, set, conflicts, resolvingKeys, onResolveConflict }: Props) => {

  const conflictFor = (field: string) => findConflict(conflicts, field)

  return (
    <div className={c.section}>
      <p className={c.section_title}>Профиль контакта</p>
      <div className={c.fields_grid}>

        {FIELDS.map(({ key, label, placeholder }) => (
          <div
            key={key}
            className={c.field}
            data-full
          >
            <ConflictableField
              label={label}
              field={key}
              multiline
              conflict={conflictFor(key)}
              resolvingKeys={resolvingKeys}
              onResolveConflict={onResolveConflict}
            >
              <Textarea
                autoResize
                className={c.field_textarea}
                value={contact[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                rows={2}
              />
            </ConflictableField>
          </div>
        ))}

      </div>
    </div>
  )
}

export { Profile }
