'use client'

import { useState, useEffect } from 'react'

import { Button } from '@/shared/UI'
import { STATIC_URL } from '@/shared/config/api.config'
import c from './PrivacyBanner.module.scss'


const STORAGE_KEY = 'privacy_accepted'

const PrivacyBanner = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={c.banner}>
      <p className={c.text}>
        Мы используем cookies только для авторизации. Чувствительные данные контактов зашифрованы.
        При использовании AI-функций данные передаются сторонним AI-сервисам.{' '}
        <a
          href={`${STATIC_URL}/privacy.html`}
          target="_blank"
          rel="noopener noreferrer"
          className={c.link}
        >
          Политика конфиденциальности
        </a>
      </p>
      <Button
        variant="primary"
        className={c.btn}
        onClick={handleAccept}
      >
        Понятно
      </Button>
    </div>
  )
}

export { PrivacyBanner }
