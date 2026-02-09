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
  const [suggestions, setSuggestions] = useState<string[]>([])
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

  const localSuggestions = useMemo(() => {
    if (!query.trim()) {
      return recentSearches.slice(0, 6)
    }
    const lowered = query.toLowerCase()
    return recentSearches
      .filter((item) => item.toLowerCase().includes(lowered))
      .slice(0, 6)
  }, [query, recentSearches])

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(localSuggestions)
      return
    }
    if (query.trim().length < 2) {
      setSuggestions(localSuggestions)
      return
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        setIsSuggesting(true)
        const results = await searchIssueSuggestions(query.trim())
        const titles = results.map(
          (issue) =>
            `${issue.volume?.name ?? 'Untitled'} #${issue.issue_number}`,
        )
        setSuggestions(titles)
      } catch {
        setSuggestions(localSuggestions)
      } finally {
        setIsSuggesting(false)
      }
    }, 350)
  }, [query, localSuggestions])

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

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-800 text-lg font-semibold">
                C
              </div>
              <div>
                <p className="text-lg font-semibold">Comictracks</p>
                <p className="text-sm text-white/60">
                  Community soundtracks for comic issues
                </p>
              </div>
            </div>
            <AuthPanel />
          </div>
          <div className="w-full md:max-w-xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={() => handleSearch()}
              isLoading={isLoading}
              suggestions={suggestions}
              isSuggesting={isSuggesting}
              onSelectSuggestion={(value) => {
                setQuery(value)
                setError(null)
                handleSearch(value)
              }}
            />
          </div>
        </header>

        {selectedIssue ? (
          <IssuePage issue={selectedIssue} onBack={() => setSelectedIssue(null)} />
        ) : (
          <section className="flex flex-col gap-6">
            {error ? (
              <Card className="border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </Card>
            ) : null}
            {issues.length > 0 ? (
              <ComicGrid issues={issues} onSelect={setSelectedIssue} />
            ) : (
              <Card className="p-6 text-sm text-white/60">
                Search for a comic issue to see community soundtracks.
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
