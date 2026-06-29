import type { NextConfig } from 'next'

// Content-Security-Policy задаётся в src/middleware.ts (per-request nonce для скриптов).
// Остальные статичные заголовки безопасности — здесь.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['*.github.dev', '*.app.github.dev', '*.githubpreview.dev', '*.devtunnels.ms'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return []
    // Бэкенд-origin без /api (NEXT_PUBLIC_DOMAIN строится как $DOMAIN/api)
    const backendUrl = process.env.DOMAIN ?? 'http://localhost:5000'
    return [{ source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` }]
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
