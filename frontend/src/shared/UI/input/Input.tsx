'use client'

import { forwardRef } from 'react'
import { cn } from '@/shared/utils'

import type { ForwardedRef, InputHTMLAttributes } from 'react'
import c from './input.module.scss'

type IInputProps = {
  label?: string
  error?: string
} & InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef(({ label, error, className, ...props }: IInputProps, ref: ForwardedRef<HTMLInputElement>) => {
  const input = (
    <input ref={ref} className={cn(className, c.input)} data-error={!!error} {...props} />
  )

  if (!label && !error) return input

  return (
    <div className={c.label_wrapper}>
      {label && <label>{label}</label>}
      {input}
      {error && <span className={c.error_text}>{error}</span>}
    </div>
  )
})

Input.displayName = 'Input'
