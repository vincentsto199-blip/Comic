import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { ComicIssue } from '../lib/comicvine'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  suggestions?: ComicIssue[]
  localSuggestions?: string[]
  isSuggesting?: boolean
  onSelectSuggestion?: (value: string) => void
  onSelectIssueSuggestion?: (issue: ComicIssue) => void
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  suggestions = [],
  localSuggestions = [],
  isSuggesting = false,
  onSelectSuggestion,
  onSelectIssueSuggestion,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsFocused(false)
    onSubmit()
  }

  const showDropdown = isFocused && (suggestions.length > 0 || localSuggestions.length > 0 || isSuggesting)

  return (
    <div className="relative" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="relative">
        {/* Search icon */}
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search comic issue..."
          className="w-full rounded-xl border border-white/[0.08] bg-ink-800/50 py-3.5 pl-11 pr-28 text-sm text-white placeholder:text-white/30 shadow-lg shadow-black/20 transition-all duration-200 focus:border-accent-blue/30 focus:bg-ink-800/80 focus:outline-none focus:ring-1 focus:ring-accent-blue/20 focus:shadow-accent-blue/5"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent-red px-4 py-2 text-sm font-medium text-white shadow-md shadow-accent-red/20 transition-all duration-200 hover:bg-accent-red-hover hover:shadow-accent-red/30 disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching
            </span>
          ) : 'Search'}
        </button>
      </form>

      {/* Autocomplete dropdown */}
      {showDropdown ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900/95 backdrop-blur-lg shadow-2xl shadow-black/40 animate-slide-down">
          {isSuggesting ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-4 rounded-full border-2 border-accent-blue/50 border-t-transparent animate-spin" />
              <span className="text-sm text-white/40">Searching...</span>
            </div>
          ) : (
            <>
              {/* API issue suggestions */}
              {suggestions.length > 0 ? (
                <div>
                  <div className="px-4 pt-3 pb-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">Issues</p>
                  </div>
                  {suggestions.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.05] cursor-pointer group"
                      onClick={() => {
                        setIsFocused(false)
                        onSelectIssueSuggestion?.(issue)
                      }}
                    >
                      {issue.image?.small_url ? (
                        <img
                          src={issue.image.small_url}
                          alt=""
                          className="h-10 w-7 rounded-sm object-cover flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="h-10 w-7 rounded-sm bg-ink-700 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                          {issue.volume?.name ?? 'Untitled'} #{issue.issue_number}
                        </p>
                        <p className="truncate text-xs text-white/30">
                          {issue.name ?? 'Unnamed'} {issue.cover_date ? `- ${issue.cover_date}` : ''}
                        </p>
                      </div>
                      <svg className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Recent / local suggestions */}
              {localSuggestions.length > 0 && suggestions.length === 0 ? (
                <div>
                  <div className="px-4 pt-3 pb-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/25">Recent</p>
                  </div>
                  {localSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.05] cursor-pointer"
                      onClick={() => {
                        setIsFocused(false)
                        onSelectSuggestion?.(item)
                      }}
                    >
                      <svg className="h-4 w-4 text-white/20 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="text-sm text-white/60">{item}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
