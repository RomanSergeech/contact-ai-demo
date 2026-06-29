'use client'

import { useRouter } from 'next/navigation'
import { useNotificationsPanelStore } from '@/shared/store'
import { Button } from '@/shared/UI'
import { Pages } from '@/shared/config/pages.config'
import { useNotifications } from '@/shared/hooks'
import type { TNotificationItem, TNotificationVariant } from '@/shared/utils'

import c from './notifications-panel.module.scss'


const SECTIONS = [
  { key: 'today',    label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'week',     label: 'Через неделю' },
] as const

const ICONS: Record<TNotificationVariant, React.ReactNode> = {
  danger: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  muted: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

const NotificationsPanel = () => {

  const isOpen = useNotificationsPanelStore(s => s.isOpen)
  const close = useNotificationsPanelStore(s => s.close)
  const router = useRouter()

  const notifications = useNotifications()

  const totalCount =
    notifications.today.length +
    notifications.tomorrow.length +
    notifications.week.length

  const handleItemClick = (item: TNotificationItem) => {
    close()
    if (item.isTask) router.push(Pages.tasks)
    else if (item.contactId) router.push(Pages.contact(item.contactId))
  }

  return (
    <>
      <div
        className={c.overlay}
        data-open={isOpen}
        onClick={close}
      />

      <div
        className={c.panel}
        data-open={isOpen}
      >

        <div className={c.header}>
          <div className={c.header_title}>
            <span>Уведомления</span>
            {totalCount > 0 &&
              <span className={c.total_badge}>{totalCount}</span>
            }
          </div>
          <Button
            variant="secondary"
            iconOnly
            className={c.close_btn}
            onClick={close}
            aria-label="Закрыть"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </div>

        <div className={c.content}>
          {totalCount === 0
            ? (
              <div className={c.empty}>
                <div className={c.empty_icon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className={c.empty_title}>Всё спокойно</p>
                <p className={c.empty_sub}>Нет активных уведомлений</p>
              </div>
            )
            : SECTIONS.map(section => {
              const items = notifications[section.key]
              if (items.length === 0) return null

              return (
                <div key={section.key} className={c.section}>

                  <div className={c.section_header}>
                    <span className={c.section_label}>{section.label}</span>
                    <span className={c.section_line} />
                    <span className={c.section_count}>{items.length}</span>
                  </div>

                  <ul className={c.list}>
                    {items.map(item => (
                      <li key={item.id}>
                        <button
                          className={c.item}
                          data-variant={item.variant}
                          onClick={() => handleItemClick(item)}
                        >
                          <span className={c.item_icon}>
                            {ICONS[item.variant]}
                          </span>
                          <div className={c.item_body}>
                            <span className={c.item_text}>{item.text}</span>
                            {item.subtext &&
                              <span className={c.item_sub}>{item.subtext}</span>
                            }
                          </div>
                          <svg className={c.item_arrow} width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>

                </div>
              )
            })
          }
        </div>

      </div>
    </>
  )
}

export { NotificationsPanel }
