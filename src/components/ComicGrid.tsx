import { Card } from './ui/Card'
import type { ComicIssue } from '../lib/comicvine'

interface ComicGridProps {
  issues: ComicIssue[]
  onSelect: (issue: ComicIssue) => void
}

export function ComicGrid({ issues, onSelect }: ComicGridProps) {
  if (issues.length === 0) {
    return (
      <Card className="p-6 text-sm text-white/60">
        No issues found. Try another search.
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {issues.map((issue) => (
        <button
          key={issue.id}
          onClick={() => onSelect(issue)}
          className="text-left"
        >
          <Card className="flex h-full flex-col overflow-hidden">
            {issue.image?.small_url ? (
              <img
                src={issue.image.small_url}
                alt={issue.name ?? 'Issue cover'}
                className="h-56 w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-56 items-center justify-center bg-ink-800 text-sm text-white/40">
                No cover
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1 p-4">
              <p className="text-sm font-semibold">
                {issue.volume?.name ?? 'Untitled'} #{issue.issue_number}
              </p>
              <p className="text-xs text-white/60">
                {issue.name ?? 'Unnamed Issue'}
              </p>
              <p className="text-xs text-white/40">
                {issue.cover_date ?? 'Unknown date'}
              </p>
            </div>
          </Card>
        </button>
      ))}
    </div>
  )
}
