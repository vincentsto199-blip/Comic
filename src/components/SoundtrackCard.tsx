import { useRef, useState } from 'react'
import { Card } from './ui/Card'
import type { Soundtrack, Track } from '../types'
import { TrackRow } from './TrackRow'

interface SoundtrackCardProps {
  soundtrack: Soundtrack
  onPlay: (track: Track) => void
  onVote: (soundtrack: Soundtrack, value: 1 | -1) => void
  onEdit: (soundtrack: Soundtrack) => void
  currentUserId?: string | null
}

export function SoundtrackCard({
  soundtrack,
  onPlay,
  onVote,
  onEdit,
  currentUserId,
}: SoundtrackCardProps) {
  const upActive = soundtrack.currentUserVote === 1
  const downActive = soundtrack.currentUserVote === -1
  const isOwner = Boolean(currentUserId && soundtrack.user_id === currentUserId)
  const [upBounce, setUpBounce] = useState(false)
  const [downBounce, setDownBounce] = useState(false)
  const upRingRef = useRef<HTMLSpanElement>(null)
  const downRingRef = useRef<HTMLSpanElement>(null)

  const handleVote = (direction: 1 | -1) => {
    if (direction === 1) {
      setUpBounce(true)
      setTimeout(() => setUpBounce(false), 400)
    } else {
      setDownBounce(true)
      setTimeout(() => setDownBounce(false), 400)
    }
    onVote(soundtrack, direction)
  }

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{soundtrack.title}</p>
            <p className="text-xs text-white/35">
              by {soundtrack.user_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isOwner ? (
            <button
              onClick={() => onEdit(soundtrack)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
            >
              Edit
            </button>
          ) : null}

          {/* Upvote button */}
          <button
            onClick={() => handleVote(1)}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
              upActive
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent'
            } ${upBounce ? 'animate-vote-bounce' : ''}`}
          >
            <span ref={upRingRef} className={upBounce ? 'absolute inset-0 rounded-lg bg-emerald-400/20 animate-pulse-ring' : 'hidden'} />
            <svg width="12" height="12" viewBox="0 0 24 24" fill={upActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {soundtrack.upvotes}
          </button>

          {/* Downvote button */}
          <button
            onClick={() => handleVote(-1)}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
              downActive
                ? 'bg-accent-red/15 text-accent-red-hover border border-accent-red/20'
                : 'text-white/40 hover:text-accent-red-hover hover:bg-accent-red/10 border border-transparent'
            } ${downBounce ? 'animate-vote-bounce' : ''}`}
          >
            <span ref={downRingRef} className={downBounce ? 'absolute inset-0 rounded-lg bg-accent-red/20 animate-pulse-ring' : 'hidden'} />
            <svg width="12" height="12" viewBox="0 0 24 24" fill={downActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {soundtrack.downvotes}
          </button>
        </div>
      </div>

      {/* Tracks list */}
      <div className="flex flex-col border-t border-white/[0.04]">
        {soundtrack.tracks.length > 0 ? (
          soundtrack.tracks.map((track, idx) => (
            <TrackRow key={track.id} track={track} onPlay={onPlay} index={idx} />
          ))
        ) : (
          <p className="px-5 py-4 text-sm text-white/30">
            No tracks yet for this soundtrack.
          </p>
        )}
      </div>
    </Card>
  )
}
