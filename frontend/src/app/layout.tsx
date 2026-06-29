import { Inter } from 'next/font/google'
import { Alert } from '@/shared/UI/alert/Alert'
import { PrivacyBanner } from '@/widgets'

import type { Metadata } from 'next'

import '@/shared/assets/style.scss'


const inter = Inter({
  style:   'normal',
  weight:  ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'cyrillic'],
})

// Нонс CSP проставляется только при server-side рендере по заголовку запроса (см. src/proxy.ts).
// Статически сгенерированные страницы не получают нонс — в проде их скрипты режет CSP.
// force-dynamic на корневом лейауте делает все маршруты динамическими, чтобы нонс попадал в скрипты.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    template: '%s - Contact AI',
    default:  'Contact AI',
  },
  description: 'Contact AI — умная CRM для управления контактами',
  robots: 'none'
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body className={inter.className}>
        {children}
        <Alert />
        <PrivacyBanner />
      </body>
    </html>
  )
}
