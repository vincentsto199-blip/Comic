import { Button } from './ui/Button'
import type { Track } from '../types'

interface TrackRowProps {
  track: Track
  onPlay: (track: Track) => void
}

export function TrackRow({ track, onPlay }: TrackRowProps) {
  const pageLabel =
    track.page_start && track.page_end
      ? `Pages ${track.page_start}-${track.page_end}`
      : 'Pages TBD'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-800/70 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{track.title}</p>
        <p className="text-xs text-white/60">{pageLabel}</p>
      </div>
      <Button
        onClick={() => onPlay(track)}
        className="px-3 py-1.5 text-xs"
      >
        Open
      </Button>
    </div>
  )
}
