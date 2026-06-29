import { useRef } from 'react'
import { Input } from '@/shared/UI'
import { formatPhone } from '@/shared/utils'
import type { TContactInfo } from '@/shared/types/contact.types'

import c from './BasicFields.module.scss'


interface Props {
  contactInfo: TContactInfo
  setContactInfo: <K extends keyof TContactInfo>(field: K, value: TContactInfo[K]) => void
}

const BasicFields = ({ contactInfo, setContactInfo }: Props) => {

  const phoneRef = useRef<HTMLInputElement>(null)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prevValue = e.target.value
    const cursor = e.target.selectionStart ?? prevValue.length
    const digitsBeforeCursor = prevValue.slice(0, cursor).replace(/\D/g, '').length

    const formatted = formatPhone(prevValue)
    setContactInfo('phone', formatted)

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

  return (
    <>
      <div className={c.field}>
        <label>Телефон</label>
        <Input
          ref={phoneRef}
          value={contactInfo.phone}
          onChange={handlePhoneChange}
          placeholder="+7 (___) ___-__-__"
        />
      </div>

      <div className={c.field}>
        <label>Email</label>
        <Input
          value={contactInfo.email}
          onChange={e => setContactInfo('email', e.target.value)}
          placeholder="example@mail.com"
        />
      </div>

      <div className={c.field}>
        <label>WhatsApp</label>
        <Input
          value={contactInfo.whatsapp}
          onChange={e => setContactInfo('whatsapp', e.target.value)}
          placeholder="https://wa.me/79991234567"
        />
      </div>

      <div className={c.field}>
        <label>Instagram</label>
        <Input
          value={contactInfo.instagram}
          onChange={e => setContactInfo('instagram', e.target.value)}
          placeholder="https://instagram.com/username"
        />
      </div>
    </>
  )
}

export { BasicFields }
