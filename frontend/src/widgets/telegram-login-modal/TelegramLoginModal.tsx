'use client'

import { useState, useRef, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { useUserStore } from '@/shared/store'
import { Modal, modalCss as m, Button, Input } from '@/shared/UI'
import { showAlert, formatPhone } from '@/shared/utils'
import { SettingsService } from '@/shared/api'
import { STATIC_URL } from '@/shared/config/api.config'

import c from './TelegramLoginModal.module.scss'

type TStep = 'phone' | 'code' | 'password'

interface Props {
  active: boolean
  onClose: () => void
  onConnected: () => void
}

const onError = (msg: string) => showAlert({
  text: [msg],
  btnText: 'Закрыть',
}, 5000)

const TelegramLoginModal = ({ active, onClose, onConnected }: Props) => {

  const setTelegramConnected = useUserStore(state => state.setTelegramConnected)

  const [step, setStep] = useState<TStep>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState(false)

  const phoneRef = useRef<HTMLInputElement>(null)
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrActiveRef = useRef(false)
  const qrPollErrorsRef = useRef(0)

  const stopQrPolling = () => {
    qrActiveRef.current = false
    qrPollErrorsRef.current = 0
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current)
      qrPollingRef.current = null
    }
    setQrToken(null)
    setQrLoading(false)
    setQrError(false)
  }

  const startQrPolling = (restartFn: () => Promise<void>) => {
    qrPollingRef.current = setInterval(async () => {
      if (!qrActiveRef.current) return
      try {
        const { data } = await SettingsService.telegramQrPoll()
        qrPollErrorsRef.current = 0
        if (data.step === 'done') {
          stopQrPolling()
          setTelegramConnected()
          reset()
          onConnected()
        } else if (data.step === 'password') {
          stopQrPolling()
          setStep('password')
        } else if (data.token) {
          setQrToken(data.token)
        }
      } catch {
        qrPollErrorsRef.current += 1
        if (qrPollErrorsRef.current >= 3) {
          stopQrPolling()
          void restartFn()
        }
      }
    }, 2000)
  }

  const startQr = async () => {
    setQrLoading(true)
    setQrError(false)
    qrActiveRef.current = true
    try {
      const { data } = await SettingsService.telegramQrStart()
      setQrToken(data.token)
      startQrPolling(startQr)
    } catch {
      setQrError(true)
      qrActiveRef.current = false
      // если QR недоступен — не показываем, только телефон
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    if (active) {
      startQr()
    } else {
      stopQrPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const reset = () => {
    setStep('phone')
    setPhone('')
    setCode('')
    setPassword('')
  }

  const handleClose = async () => {
    stopQrPolling()
    if (step !== 'phone') {
      try {
        await SettingsService.telegramLoginCancel()
      } catch {
        // игнорируем ошибку
      }
    }
    reset()
    onClose()
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prevValue = e.target.value
    const cursor = e.target.selectionStart ?? prevValue.length
    const digitsBeforeCursor = prevValue.slice(0, cursor).replace(/\D/g, '').length

    const formatted = formatPhone(prevValue)
    setPhone(formatted)

    requestAnimationFrame(() => {
      const input = phoneRef.current
      if (!input) return

      let pos = formatted.length
      let digitsSeen = 0

      if (digitsBeforeCursor === 0) {
        pos = 0
      } else {
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i]!)) digitsSeen++
          if (digitsSeen >= digitsBeforeCursor) {
            pos = i + 1
            break
          }
        }
      }

      input.setSelectionRange(pos, pos)
    })
  }

  const handleStart = async () => {
    stopQrPolling()
    setSubmitting(true)
    try {
      await SettingsService.telegramLoginStart(`+${phone.replace(/\D/g, '')}`)
      setStep('code')
    } catch (err) {
      onError((err as Error).message ?? 'Не удалось отправить код')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCode = async () => {
    setSubmitting(true)
    try {
      const { data } = await SettingsService.telegramLoginCode(code.trim())
      if (data.step === 'password') {
        setStep('password')
      } else {
        setTelegramConnected()
        reset()
        onConnected()
      }
    } catch (err) {
      onError((err as Error).message ?? 'Не удалось войти в Telegram')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePassword = async () => {
    setSubmitting(true)
    try {
      await SettingsService.telegramLoginPassword(password)
      setTelegramConnected()
      reset()
      onConnected()
    } catch (err) {
      onError((err as Error).message ?? 'Не удалось войти в Telegram')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Подключить Telegram"
      onClose={handleClose}
      active={active}
    >
      <div className={m.body}>

        <p className={c.hint}>
          Подключение вашего аккаунта Telegram нужно исключительно, чтобы по вашему запросу заполнять карточки
          контактов данными из публичных профилей и каналов. Сессия хранится в зашифрованном виде;
          отключить интеграцию можно в любой момент в настройках.{' '}
          <a
            href={`${STATIC_URL}/privacy.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Политика конфиденциальности
          </a>
        </p>

        {step === 'phone' && (
          <>
            <div className={c.qr_section}>
              {qrLoading && (
                <div className={c.qr_placeholder}>
                  <span className={c.spinner} />
                </div>
              )}

              {!qrLoading && qrError && (
                <div className={c.qr_error}>
                  <span>QR-код устарел</span>
                  <Button variant="text" className={c.qr_error_btn} onClick={() => void startQr()}>
                    Обновить
                  </Button>
                </div>
              )}

              {!qrLoading && !qrError && qrToken && (
                <div className={c.qr_wrap}>
                  <QRCode
                    value={`tg://login?token=${qrToken}`}
                    size={140}
                  />
                </div>
              )}

              {(qrLoading || qrToken || qrError) && (
                <p className={c.qr_hint}>Отсканируйте в приложении Telegram</p>
              )}
            </div>

            {(qrLoading || qrToken || qrError) && (
              <div className={c.divider}>или</div>
            )}

            <div className={m.field}>
              <Input
                ref={phoneRef}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
              />
              <label className={c.phone_hint}>
                Введите номер телефона в международном формате.
              </label>
            </div>
          </>
        )}

        {step === 'code' &&
          <div className={m.field}>
            <label>Введите код, который пришёл в Telegram.</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Код подтверждения"
            />
          </div>
        }

        {step === 'password' &&
          <div className={m.field}>
            <label>У вашего аккаунта включена двухфакторная аутентификация. Введите пароль.</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Пароль"
            />
          </div>
        }

      </div>

      <div className={m.footer}>
        <Button
          variant="ghost"
          className={m.cancel_btn}
          onClick={handleClose}
          disabled={submitting}
        >
          Отмена
        </Button>

        {step === 'phone' &&
          <Button
            onClick={handleStart}
            disabled={submitting || !phone.trim()}
          >
            {submitting ? 'Отправка...' : 'Получить код'}
          </Button>
        }

        {step === 'code' &&
          <Button
            onClick={handleCode}
            disabled={submitting || !code.trim()}
          >
            {submitting ? 'Проверка...' : 'Подтвердить'}
          </Button>
        }

        {step === 'password' &&
          <Button
            onClick={handlePassword}
            disabled={submitting || !password.trim()}
          >
            {submitting ? 'Проверка...' : 'Подтвердить'}
          </Button>
        }
      </div>
    </Modal>
  )
}

export { TelegramLoginModal }
