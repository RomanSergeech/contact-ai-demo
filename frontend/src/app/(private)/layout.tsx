'use client'

import { useEffect, type PropsWithChildren } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/widgets/header/Header'
import { NotificationsPanel } from '@/widgets'
import { useAuthStore } from '@/shared/store'
import { useAutoEventTasks } from '@/shared/hooks'
import { Loader } from '@/shared/UI'


const Layout = ({ children }: PropsWithChildren) => {
  const isAuth = useAuthStore(s => s.isAuth)
  const loading = useAuthStore(s => s.loading)

  const router = useRouter()

  useAutoEventTasks()

  useEffect(() => {
    if (!isAuth) {
      useAuthStore.getState().checkAuth().catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && !isAuth) {
      router.replace('/')
    }
  }, [loading, isAuth, router])

  if (loading) return <Loader fullScreen />
  if (!isAuth) return null

  return (
    <>
      <Header />
      {children}
      <NotificationsPanel />
    </>
  )
}

export default Layout
