'use client'

import { useAlertStore } from '@/shared/store'
import { Button } from '../button/Button'
import c from './alert.module.scss'

const Alert = () => {
  const { alert, visible, hide } = useAlertStore()

  if (!visible || !alert) return null

  return (
    <div className={c.alert_overlay} onClick={hide}>
      <div className={c.alert} onClick={e => e.stopPropagation()}>
        {alert.text.map((t, i) =>
          <p key={i}>{t}</p>
        )}
        <Button variant="primary" className={c.btn} onClick={hide}>{alert.btnText}</Button>
      </div>
    </div>
  )
}

export { Alert }
