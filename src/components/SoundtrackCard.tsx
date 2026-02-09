import { useState } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
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
  const [upPulse, setUpPulse] = useState(false)
  const [downPulse, setDownPulse] = useState(false)

  const triggerPulse = (direction: 1 | -1) => {
    if (direction === 1) {
      setUpPulse(true)
      setTimeout(() => setUpPulse(false), 220)
    } else {
      setDownPulse(true)
      setTimeout(() => setDownPulse(false), 220)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold">{soundtrack.title}</p>
          <p className="text-xs text-white/60">
            by {soundtrack.user_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Button
              onClick={() => onEdit(soundtrack)}
              className="px-3 py-1.5 text-xs"
            >
              Edit
            </Button>
          ) : null}
          <Button
            onClick={() => {
              onVote(soundtrack, 1)
              triggerPulse(1)
            }}
            className={`px-3 py-1.5 text-xs transition-transform ${
              upActive
                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                : ''
            } ${upPulse ? 'scale-110' : ''}`}
          >
            ▲ {soundtrack.upvotes}
          </Button>
          <Button
            onClick={() => {
              onVote(soundtrack, -1)
              triggerPulse(-1)
            }}
            className={`px-3 py-1.5 text-xs transition-transform ${
              downActive ? 'border-red-400/60 bg-red-500/20 text-red-100' : ''
            } ${downPulse ? 'scale-110' : ''}`}
          >
            ▼ {soundtrack.downvotes}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {soundtrack.tracks.length > 0 ? (
          soundtrack.tracks.map((track) => (
            <TrackRow key={track.id} track={track} onPlay={onPlay} />
          ))
        ) : (
          <p className="text-sm text-white/50">
            No tracks yet for this soundtrack.
          </p>
        )}
      </div>
    </Card>
  )
}
