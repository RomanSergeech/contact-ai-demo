import { NextResponse, type NextRequest } from 'next/server'

const isDev = process.env.NODE_ENV !== 'production'

// CSP формируется здесь (а не в next.config), чтобы в продакшене
// задавать per-request nonce для скриптов и отказаться от 'unsafe-inline'.
// В dev оставляем послабления — иначе ломается HMR Next.js (нужен 'unsafe-eval').
export function proxy(request: NextRequest) {

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${isDev ? ' http://localhost:* https://*.devtunnels.ms' : ''}`,
    "font-src 'self'",
    `connect-src 'self'${isDev ? ' http://localhost:* https://*.devtunnels.ms' : ''}`,
    isDev ? "frame-ancestors 'self' https://*.devtunnels.ms" : "frame-ancestors 'none'",
  ].join('; ')

  // x-nonce пробрасываем в request, чтобы Next автоматически проставил nonce своим скриптам
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    // Применяем ко всем маршрутам, кроме статики и API-проксирования Next
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
