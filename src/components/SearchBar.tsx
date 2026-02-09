import type { FormEvent } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  suggestions?: string[]
  isSuggesting?: boolean
  onSelectSuggestion?: (value: string) => void
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  suggestions = [],
  isSuggesting = false,
  onSelectSuggestion,
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="relative">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search Comic Vine issues..."
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>
      {suggestions.length > 0 || isSuggesting ? (
        <div className="absolute z-10 mt-2 w-full rounded-xl border border-white/10 bg-ink-900 shadow-lg">
          {isSuggesting ? (
            <div className="px-4 py-2 text-sm text-white/50">Loading...</div>
          ) : (
            suggestions.map((item) => (
              <button
                key={item}
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-ink-800"
                onClick={() => onSelectSuggestion?.(item)}
              >
                {item}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
