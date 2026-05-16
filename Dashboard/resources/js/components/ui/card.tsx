import * as React from 'react'

import { cn } from '../../lib/utils'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-2xl border shadow-sm transition-colors duration-300', className)}
      style={{
        backgroundColor: 'var(--mourchid-surface)',
        borderColor: 'var(--mourchid-border)',
        boxShadow: 'var(--mourchid-shadow)',
        ...style,
      }}
      {...props}
    />
  )
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between p-5 pb-2', className)} {...props} />
  )
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, style, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-sm font-semibold tracking-tight', className)}
      style={{ color: 'var(--mourchid-text)', ...style }}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-2', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'
