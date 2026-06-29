"use client"

import { AuthPage } from '@/components/auth/AuthPage'
import { Pages } from '@/shared/config/pages.config'
import { useAuthStore } from '@/shared/store'
import { Loader } from '@/shared/UI'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {

  const isAuth = useAuthStore(state => state.isAuth)
  const loading = useAuthStore(state => state.loading)

  const router = useRouter()

  useEffect(() => {
    if (!isAuth && loading) {
      useAuthStore.getState().checkAuth().catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && !isAuth) {
      router.replace('/')
    }
    if (!loading && isAuth) {
      router.replace(Pages.main)
    }
  }, [loading, isAuth, router])

  if (loading) return <Loader fullScreen />

  if (isAuth) return null

  return <AuthPage />
}
