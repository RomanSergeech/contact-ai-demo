'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUserStore, useAuthStore, useNotificationsPanelStore } from '@/shared/store'
import { Pages } from '@/shared/config/pages.config'
import { cn, isLinkActive } from '@/shared/utils'
import { useNotifications } from '@/shared/hooks'

import c from './header.module.scss'


const BASE_NAV = [
  { label: 'Контакты', href: Pages.main },
  { label: 'Задачи',   href: Pages.tasks },
  { label: 'Настройки', href: Pages.settings },
]

const Header = () => {

  const name = useUserStore(s => s.name)
  const role = useUserStore(s => s.role)
  const openPanel = useNotificationsPanelStore(s => s.open)

  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const todayCount = useNotifications().today.length

  const handleLogout = async () => {
    await useAuthStore.getState().logout()
    router.replace('/')
  }

  return (
    <header className={c.header}>
      <div className={cn(c.container, '_container')}>

        <span
          className={c.logo}
          onClick={() => router.push('/main')}
        >
          Contact AI
        </span>

        <nav className={c.nav}>
          {BASE_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={c.nav_link}
              data-active={isLinkActive(pathname, item.href)}
            >
              {item.label}
            </Link>
          ))}

          <button
            className={c.notif_btn}
            onClick={openPanel}
            aria-label="Уведомления"
          >
            Уведомления
            {todayCount > 0 &&
              <span className={c.notif_badge}>{todayCount}</span>
            }
          </button>

          {role === 'admin' &&
            <>
              <span className={c.nav_divider} />
              <Link
                href={Pages.adminUsers}
                className={c.nav_link}
                data-active={isLinkActive(pathname, Pages.adminUsers)}
              >
                Пользователи
              </Link>
            </>
          }
        </nav>

        <div className={c.user}>
          <span className={c.user_name}>{name}</span>
          <button className={c.logout_btn} onClick={handleLogout}>Выйти</button>

          <button className={c.burger} onClick={() => setMobileOpen(true)} aria-label="Меню">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

      </div>

      <div
        className={c.mobile_menu}
        data-active={mobileOpen}
        onClick={() => setMobileOpen(false)}
      >
        <div className={c.mobile_menu_panel} onClick={e => e.stopPropagation()}>
          <div className={c.mobile_menu_header}>
            <span className={c.mobile_menu_user_name}>{name}</span>
            <button className={c.mobile_menu_close} onClick={() => setMobileOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {BASE_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              data-active={isLinkActive(pathname, item.href)}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <button
            className={c.mobile_notif_btn}
            onClick={() => { setMobileOpen(false); openPanel() }}
          >
            Уведомления
            {todayCount > 0 &&
              <span className={c.notif_badge}>{todayCount}</span>
            }
          </button>

          {role === 'admin' &&
            <Link
              href={Pages.adminUsers}
              data-active={isLinkActive(pathname, Pages.adminUsers)}
              onClick={() => setMobileOpen(false)}
            >
              Пользователи
            </Link>
          }

          <button className={c.mobile_menu_logout} onClick={handleLogout}>Выйти</button>
        </div>
      </div>
    </header>
  )
}

export { Header }
