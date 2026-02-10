import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
}

export function Button({
  className = '',
  variant = 'default',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] cursor-pointer'

  const variants: Record<string, string> = {
    default:
      'border border-white/10 bg-white/[0.06] px-4 py-2 text-white/90 hover:bg-white/[0.12] hover:border-white/15',
    primary:
      'border border-accent-red/30 bg-accent-red px-4 py-2 text-white hover:bg-accent-red-hover shadow-lg shadow-accent-red/20 hover:shadow-accent-red/30',
    ghost:
      'px-3 py-2 text-white/60 hover:text-white hover:bg-white/[0.06]',
    danger:
      'border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-200 hover:bg-red-500/20',
  }

  return (
    <button
      className={`${base} ${variants[variant] ?? variants.default} ${className}`}
      {...props}
    />
  )
}
