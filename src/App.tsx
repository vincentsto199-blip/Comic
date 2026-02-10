import { useEffect, useMemo, useRef, useState } from 'react'
import { ComicGrid } from './components/ComicGrid'
import { SearchBar } from './components/SearchBar'
import type { ComicIssue } from './lib/comicvine'
import { searchIssueSuggestions, searchIssues } from './lib/comicvine'
import { Card } from './components/ui/Card'
import { IssuePage } from './pages/IssuePage'
import { AuthPanel } from './components/AuthPanel'

export default function App() {
  const [query, setQuery] = useState('')
  const [issues, setIssues] = useState<ComicIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<ComicIssue | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<ComicIssue[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem('comictracks:recent-searches')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[]
        setRecentSearches(parsed)
      } catch {
        setRecentSearches([])
      }
    }
  }, [])

  const localSuggestionLabels = useMemo(() => {
    if (!query.trim()) {
      return recentSearches.slice(0, 6)
    }
    const lowered = query.toLowerCase()
    return recentSearches
      .filter((item) => item.toLowerCase().includes(lowered))
      .slice(0, 6)
  }, [query, recentSearches])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([])
      return
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        setIsSuggesting(true)
        const results = await searchIssueSuggestions(query.trim())
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setIsSuggesting(false)
      }
    }, 350)
  }, [query])

  const handleSearch = async (overrideQuery?: string) => {
    const activeQuery = (overrideQuery ?? query).trim()
    if (!activeQuery) {
      setError('Please enter a search query.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const results = await searchIssues(activeQuery)
      setIssues(results)
      const nextRecent = [
        activeQuery,
        ...recentSearches.filter((item) => item !== activeQuery),
      ].slice(0, 8)
      setRecentSearches(nextRecent)
      window.localStorage.setItem(
        'comictracks:recent-searches',
        JSON.stringify(nextRecent),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to search Comic Vine.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectIssue = (issue: ComicIssue) => {
    setSelectedIssue(issue)
    setSuggestions([])
    setQuery('')
  }

  const hasResults = issues.length > 0 || selectedIssue

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/* Top nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.05] bg-ink-950/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <button
            onClick={() => {
              setSelectedIssue(null)
              setIssues([])
              setQuery('')
              setError(null)
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-red text-sm font-bold text-white shadow-md shadow-accent-red/30 transition-transform duration-200 group-hover:scale-105">
              C
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Comictracks
            </span>
          </button>
          <AuthPanel />
        </div>
      </nav>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pt-20 pb-16">
        {selectedIssue ? (
          <div className="animate-fade-in">
            <IssuePage issue={selectedIssue} onBack={() => setSelectedIssue(null)} />
          </div>
        ) : (
          <>
            {/* Hero / centered search section */}
            <header
              className={`flex flex-col items-center justify-center text-center transition-all duration-500 ease-out ${
                hasResults ? 'py-8' : 'flex-1 py-16'
              }`}
            >
              <div className={`flex flex-col items-center gap-6 transition-all duration-500 ${hasResults ? 'scale-90' : ''}`}>
                {/* Logo icon */}
                <div className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-accent-red to-accent-red-muted shadow-xl shadow-accent-red/20 transition-all duration-500 ${
                  hasResults ? 'h-12 w-12 text-lg' : 'h-16 w-16 text-2xl'
                }`}>
                  <span className="font-bold text-white">C</span>
                </div>
                <div>
                  <h1 className={`font-bold tracking-tight text-white transition-all duration-500 ${
                    hasResults ? 'text-2xl' : 'text-4xl md:text-5xl'
                  }`}>
                    Comictracks
                  </h1>
                  <p className={`mt-2 text-white/40 transition-all duration-500 ${
                    hasResults ? 'text-sm' : 'text-base md:text-lg'
                  }`}>
                    Community soundtracks for comic issues
                  </p>
                </div>

                {/* Search bar */}
                <div className="w-full max-w-xl">
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                    onSubmit={() => handleSearch()}
                    isLoading={isLoading}
                    suggestions={suggestions}
                    localSuggestions={localSuggestionLabels}
                    isSuggesting={isSuggesting}
                    onSelectSuggestion={(value) => {
                      setQuery(value)
                      setError(null)
                      handleSearch(value)
                    }}
                    onSelectIssueSuggestion={handleSelectIssue}
                  />
                </div>
              </div>
            </header>

            {/* Results section */}
            <section className="flex flex-col gap-6 animate-fade-in">
              {error ? (
                <Card className="border-accent-red/20 bg-accent-red/5 p-4 text-sm text-red-200">
                  {error}
                </Card>
              ) : null}
              {issues.length > 0 ? (
                <ComicGrid issues={issues} onSelect={handleSelectIssue} />
              ) : !hasResults ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-white/30">
                    Search for a comic issue to discover and share soundtracks
                  </p>
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
