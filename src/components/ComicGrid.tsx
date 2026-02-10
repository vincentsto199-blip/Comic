import type { ComicIssue } from '../lib/comicvine'

interface ComicGridProps {
  issues: ComicIssue[]
  onSelect: (issue: ComicIssue) => void
}

export function ComicGrid({ issues, onSelect }: ComicGridProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-6 text-sm text-white/40 text-center">
        No issues found. Try another search.
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {issues.map((issue, idx) => (
        <button
          key={issue.id}
          onClick={() => onSelect(issue)}
          className="group text-left animate-fade-in cursor-pointer"
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900/50 transition-all duration-300 hover:border-white/[0.12] hover:bg-ink-800/60 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1">
            <div className="relative overflow-hidden">
              {issue.image?.small_url ? (
                <img
                  src={issue.image.small_url}
                  alt={issue.name ?? 'Issue cover'}
                  className="aspect-[2/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center bg-ink-800 text-xs text-white/25">
                  No cover
                </div>
              )}
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5 p-3">
              <p className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors line-clamp-2">
                {issue.volume?.name ?? 'Untitled'} <span className="text-white/35">#{issue.issue_number}</span>
              </p>
              <p className="text-xs text-white/35 truncate">
                {issue.name ?? 'Unnamed Issue'}
              </p>
              <p className="text-[10px] text-white/20 mt-1">
                {issue.cover_date ?? 'Unknown date'}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
