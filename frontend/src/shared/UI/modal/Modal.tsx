'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../button/Button'
import c from './modal.module.scss'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  active: boolean
  maxWidth?: number
  disableOverlayClose?: boolean
}

const Modal = ({ title, onClose, children, active, maxWidth = 500, disableOverlayClose = false }: Props) => (
  <AnimatePresence>
    {active && (
      <motion.div
        className={c.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={e => !disableOverlayClose && e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className={c.modal}
          style={{ maxWidth }}
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className={c.header}>
            <span>{title}</span>
            <Button variant="secondary" iconOnly onClick={onClose} aria-label="Закрыть">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>

          {children}

        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export { Modal }
export { default as modalCss } from './modal.module.scss'
