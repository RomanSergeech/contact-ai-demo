import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: '16px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--color-main)' }}>404</h1>
        <p style={{ color: 'var(--color-grey)', margin: '12px 0' }}>Страница не найдена</p>
        <Link href="/main" style={{ color: 'var(--color-main)' }}>На главную</Link>
      </div>
    </div>
  )
}
