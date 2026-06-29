'use client'

import { forwardRef } from 'react'
import { cn } from '@/shared/utils'

import c from './button.module.scss'

type TButtonVariant = 'secondary' | 'primary' | 'danger' | 'success' | 'ghost' | 'outline' | 'danger-outline' | 'surface' | 'text'

type ButtonProps = {
  children: React.ReactNode
  variant?: TButtonVariant
  iconOnly?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const Button = forwardRef(({ children, className, variant = 'secondary', iconOnly = false, ...props }: ButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {

  return (
    <button
      className={cn(c.button, className)}
      data-variant={variant}
      data-icon={iconOnly || undefined}
      {...props}
      ref={ref}>
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export { Button }
