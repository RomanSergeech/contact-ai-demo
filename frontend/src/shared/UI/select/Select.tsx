'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/utils'

import c from './select.module.scss'


interface Props {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

const Select = ({ options, value, onChange, disabled, className }: Props) => {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        wrapRef.current && !wrapRef.current.contains(t) &&
        dropRef.current && !dropRef.current.contains(t)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const handleOpen = () => {
    if (disabled) return
    if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect())
    setOpen(prev => !prev)
  }

  return (
    <div
      ref={wrapRef}
      className={cn(c.select_wrap, className)}
      data-open={open}
      data-disabled={disabled}
    >
      <button type="button" className={c.select_trigger} onClick={handleOpen}>
        <span>{selected?.label ?? '—'}</span>
        <svg
          className={c.chevron}
          data-open={open}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && rect && createPortal(
        <div
          ref={dropRef}
          className={c.dropdown}
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width }}
        >
          {options.map(o => (
            <div
              key={o.value}
              className={c.option}
              data-active={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export { Select }
