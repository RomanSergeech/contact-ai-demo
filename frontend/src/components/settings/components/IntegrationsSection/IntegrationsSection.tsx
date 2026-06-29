'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserStore } from '@/shared/store'
import { Button } from '@/shared/UI'
import { showAlert } from '@/shared/utils'
import { TelegramLoginModal, VkOAuthModal } from '@/widgets'

import c from './IntegrationsSection.module.scss'


const IntegrationsSection = () => {
  const { vk_connected, telegram_connected, disconnectVk, disconnectTelegram, setVkConnected } = useUserStore()

  const [vkSaving, setVkSaving] = useState(false)
  const [telegramSaving, setTelegramSaving] = useState(false)
  const [vkModal, setVkModal] = useState(false)
  const [telegramModal, setTelegramModal] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const integration = searchParams.get('integration')
    const status = searchParams.get('status')
    if (!integration || !status) return

    if (searchParams.get('popup') === '1') {
      localStorage.setItem('vk-oauth-result', JSON.stringify({ status, ts: Date.now() }))
      if (window.opener) window.opener.postMessage({ type: 'vk-oauth', status }, window.location.origin)
      setTimeout(() => window.close(), 150)
      return
    }

    router.replace('/settings')

    if (integration === 'vk') {
      showAlert({
        text: [status === 'success' ? 'VK успешно подключён' : 'Не удалось подключить VK'],
        btnText: 'Закрыть',
      }, 5000)
    }
  }, [searchParams, router])

  useEffect(() => {
    const handleVkOauthResult = (status: string) => {
      if (status === 'success') {
        setVkConnected()
        setVkModal(false)
        showAlert({
          text: ['VK успешно подключён'],
          btnText: 'Закрыть',
        }, 5000)
      } else {
        showAlert({
          text: ['Не удалось подключить VK'],
          btnText: 'Закрыть',
        }, 5000)
      }
    }

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'vk-oauth') return

      handleVkOauthResult(e.data.status)
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'vk-oauth-result' || !e.newValue) return

      const { status } = JSON.parse(e.newValue)
      localStorage.removeItem('vk-oauth-result')
      handleVkOauthResult(status)
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
    }
  }, [setVkConnected])

  const handleDisconnectVk = async () => {
    setVkSaving(true)
    try {
      await disconnectVk()
    } finally {
      setVkSaving(false)
    }
  }

  const handleDisconnectTelegram = async () => {
    setTelegramSaving(true)
    try {
      await disconnectTelegram()
    } finally {
      setTelegramSaving(false)
    }
  }

  return (
    <div className={c.section}>
      <p className={c.section_title}>Интеграции</p>
      <p className={c.field_label}>
        Подключите аккаунты VK и Telegram, чтобы заполнять карточки контактов данными из публичных профилей.
      </p>

      <div className={c.integration_actions}>
        <p className={c.field_label}>
          VK — статус:
          <span
            data-connected={vk_connected}
            className={c.integration_status}
          >
            {vk_connected ? 'Подключено' : 'Не подключено'}
          </span>
        </p>
        {vk_connected ? (
          <Button
            variant="ghost"
            className={c.cancel_btn}
            onClick={handleDisconnectVk}
            disabled={vkSaving}
          >
            Отключить
          </Button>
        ) : (
          <Button
            variant="primary"
            className={c.save_btn}
            onClick={() => setVkModal(true)}
          >
            Войти через VK
          </Button>
        )}
      </div>

      <div className={c.integration_actions}>
        <p className={c.field_label}>
          Telegram — статус:
          <span
            data-connected={telegram_connected}
            className={c.integration_status}
          >
            {telegram_connected ? 'Подключено' : 'Не подключено'}
          </span>
        </p>
        {telegram_connected ? (
          <Button
            variant="ghost"
            className={c.cancel_btn}
            onClick={handleDisconnectTelegram}
            disabled={telegramSaving}
          >
            Отключить
          </Button>
        ) : (
          <Button
            variant="primary"
            className={c.save_btn}
            onClick={() => setTelegramModal(true)}
          >
            Подключить Telegram
          </Button>
        )}
      </div>

      <VkOAuthModal
        active={vkModal}
        returnTo="/settings"
        onClose={() => setVkModal(false)}
      />

      <TelegramLoginModal
        active={telegramModal}
        onClose={() => setTelegramModal(false)}
        onConnected={() => setTelegramModal(false)}
      />
    </div>
  )
}

export { IntegrationsSection }
