'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader } from '@/shared/UI'


const PopupResult = () => {
  const searchParams = useSearchParams()

  useEffect(() => {
    const status = searchParams.get('status') ?? 'error'

    localStorage.setItem('vk-oauth-result', JSON.stringify({ status, ts: Date.now() }))
    if (window.opener) window.opener.postMessage({ type: 'vk-oauth', status }, window.location.origin)

    window.close()
  }, [searchParams])

  return <Loader fullScreen />
}

export default function Page() {
  return (
    <Suspense>
      <PopupResult />
    </Suspense>
  )
}
