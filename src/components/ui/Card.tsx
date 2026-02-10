import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-ink-900/80 backdrop-blur-sm shadow-lg shadow-black/20 ${className}`}
      {...props}
    />
  )
}
