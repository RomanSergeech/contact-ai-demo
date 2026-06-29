'use client'

import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'
import { cn } from '@/shared/utils'

import type { ForwardedRef, Ref, TextareaHTMLAttributes } from 'react'
import c from './input.module.scss'

type ITextareaProps = {
  label?: string
  error?: string
  autoResize?: boolean
} & TextareaHTMLAttributes<HTMLTextAreaElement>

const resize = (el: HTMLTextAreaElement) => {
  el.style.height = '0px'
  el.style.height = `${el.scrollHeight + 5}px`
}

export const Textarea = forwardRef(({ label, error, className, autoResize, onChange, ...props }: ITextareaProps, ref: ForwardedRef<HTMLTextAreaElement>) => {
  const innerRef = useRef<HTMLTextAreaElement>(null)

  const setRef = useCallback((el: HTMLTextAreaElement | null) => {
    (innerRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    if (el && autoResize) resize(el)
  }, [ref, autoResize])

  useLayoutEffect(() => {
    if (innerRef.current && autoResize) resize(innerRef.current)
  }, [props.value, autoResize])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize) resize(e.target)
    onChange?.(e)
  }, [onChange, autoResize])

  const textarea = (
    <textarea
      className={cn(className, c.input)}
      data-error={!!error}
      {...props}
      onChange={handleChange}
      ref={setRef as Ref<HTMLTextAreaElement>}
    />
  )

  if (!label && !error) return textarea

  return (
    <div className={c.label_wrapper}>
      {label && <label>{label}</label>}
      {textarea}
      {error && <span className={c.error_text}>{error}</span>}
    </div>
  )
})

Textarea.displayName = 'Textarea'
