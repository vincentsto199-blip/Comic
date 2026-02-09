import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-ink-900 shadow-sm ${className}`}
      {...props}
    />
  )
}
