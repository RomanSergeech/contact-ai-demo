'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

import c from './collapsible.module.scss'

interface Props {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

const Collapsible = ({ title, defaultOpen = false, children }: Props) => {

  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={c.collapsible}>
      <button
        type="button"
        className={c.header}
        data-open={open}
        onClick={() => setOpen(prev => !prev)}
      >
        <span>{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={c.chevron}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open &&
        <motion.div
          className={c.content}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      }
    </div>
  )
}

export { Collapsible }
