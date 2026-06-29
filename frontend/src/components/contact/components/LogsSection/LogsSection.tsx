import { Collapsible, ExpandableText } from '@/shared/UI'
import type { TContactScrapingLog } from '@/shared/types/contact.types'

import c from './LogsSection.module.scss'

const PLATFORM_LABEL: Record<TContactScrapingLog['platform'], string> = {
  telegram: 'Telegram',
  vk:       'VK',
  website:  'Сайт',
}

const SOURCE_LABEL: Record<'profile' | 'group', string> = {
  profile: 'Личная страница',
  group: 'Группа',
}

const TYPE_LABEL: Record<TContactScrapingLog['type'], string> = {
  added: 'Добавлено',
  conflict: 'Конфликты',
  error: 'Ошибка',
  no_changes: 'Без изменений',
}

const RESOLUTION_LABEL: Record<'changed' | 'skipped', string> = {
  changed: 'Изменено',
  skipped: 'Пропущено',
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'ФИО',
  position: 'Должность',
  company: 'Компания',
  direction: 'Направление деятельности',
  goals: 'Цели',
  main_pain: 'Главная боль',
  interests: 'Интересы',
  dream: 'Мечта',
  personal_traits: 'Личные характеристики',
  useful_to_me: 'Чем может быть полезен мне',
  useful_to_them: 'Чем я могу быть полезен',
  birth_date: 'Дата рождения',
  recent_activity_summary: 'Сводка активности',
  recent_topics: 'Темы и интересы',
  conversation_starters: 'Поводы для разговора',
  'contact_info.phone': 'Телефон',
  'contact_info.email': 'Email',
  'contact_info.telegram_profile': 'Профиль Telegram',
  'contact_info.telegram_group': 'Группа/канал Telegram',
  'contact_info.whatsapp': 'WhatsApp',
  'contact_info.instagram': 'Instagram',
  'contact_info.vk_profile': 'Личная страница VK',
  'contact_info.vk_group': 'Группа VK',
  'contact_info.personal_site': 'Личный сайт',
  'contact_info.company_site':  'Сайт компании',
  company_about:            'О компании',
  company_size:             'Размер компании',
  company_founded:          'Год основания',
  company_target_audience:  'Целевая аудитория',
  company_market:           'Рынок',
  company_technologies:     'Технологии',
  company_revenue:          'Выручка / стадия',
  company_competitors:      'Конкуренты',
  company_requisites:       'Реквизиты',
  important_dates: 'Важная дата',
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}/

const formatValue = (value: string | null) => {
  if (value && DATE_REGEX.test(value)) return new Date(value).toLocaleDateString('ru-RU')
  return value ?? '—'
}

interface Props {
  logs: TContactScrapingLog[]
}

const LogsSection = ({ logs }: Props) => {

  if (!logs?.length) return null

  return (
    <Collapsible title="Логи">
      <div className={c.list}>
        {logs.map(log => (
          <div key={log.id} className={c.row}>
            <div className={c.header}>
              <span className={c.date}>{new Date(log.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</span>
              <span className={c.platform}>{PLATFORM_LABEL[log.platform]}</span>
              {log.source && <span className={c.source}>{SOURCE_LABEL[log.source]}</span>}
              <span className={c.status} data-status={log.type}>{TYPE_LABEL[log.type]}</span>
            </div>

            {log.type === 'added' && log.changes.length > 0 && (
              <p className={c.summary}>
                Добавлено полей: {log.changes.length} — {log.changes.map(ch => FIELD_LABELS[ch.field] ?? ch.field).join(', ')}
              </p>
            )}

            {log.type === 'conflict' && (
              <div className={c.changes}>
                {log.changes.map(ch => (
                  <p key={ch.field} className={c.change}>
                    {ch.resolution && (
                      <span className={c.resolution} data-resolution={ch.resolution}>
                        {RESOLUTION_LABEL[ch.resolution]}
                      </span>
                    )}
                    <span className={c.field}>{FIELD_LABELS[ch.field] ?? ch.field}</span>:{' '}
                    <ExpandableText text={formatValue(ch.old_value)} /> → <ExpandableText text={formatValue(ch.new_value)} />
                  </p>
                ))}
              </div>
            )}

            {log.posts_analyzed != null && (
              <p className={c.message}>Проанализировано постов за неделю: {log.posts_analyzed}</p>
            )}

            {log.message && <p className={c.message}><ExpandableText text={log.message} /></p>}
          </div>
        ))}
      </div>
    </Collapsible>
  )
}

export { LogsSection }
