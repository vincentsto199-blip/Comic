import type { Track } from '../types'

interface TrackRowProps {
  track: Track
  onPlay: (track: Track) => void
  index?: number
}

export function TrackRow({ track, onPlay, index = 0 }: TrackRowProps) {
  const pageLabel =
    track.page_start && track.page_end
      ? `p. ${track.page_start}-${track.page_end}`
      : null

  return (
    <button
      onClick={() => onPlay(track)}
      className="group flex items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-white/[0.03] cursor-pointer text-left w-full"
    >
      {/* Track number */}
      <span className="w-5 text-right text-xs tabular-nums text-white/20 group-hover:hidden flex-shrink-0">
        {index + 1}
      </span>
      <span className="hidden w-5 items-center justify-center text-accent-red group-hover:flex flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors truncate">
          {track.title}
        </p>
      </div>

      {/* Page badge */}
      {pageLabel ? (
        <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/30 flex-shrink-0">
          {pageLabel}
        </span>
      ) : null}

      {/* External link icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0"
      >
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
      </svg>
    </button>
  )
}
