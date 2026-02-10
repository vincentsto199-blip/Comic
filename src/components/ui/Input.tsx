import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border border-white/[0.08] bg-ink-800/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 shadow-sm transition-colors duration-200 focus:border-accent-blue/40 focus:bg-ink-800 focus:outline-none focus:ring-1 focus:ring-accent-blue/20 ${className}`}
      {...props}
    />
  )
}
