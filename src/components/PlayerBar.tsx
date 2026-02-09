import { usePlayer } from '../context/PlayerContext'
import { Button } from './ui/Button'

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    canGoNext,
    canGoPrev,
    error,
    retryPlayer,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolume,
  } = usePlayer()

  if (!currentTrack) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 w-full border-t border-white/10 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-[200px]">
          <p className="text-xs uppercase text-white/40">Now playing</p>
          <p className="text-sm font-semibold">
            {currentTrack?.title ?? 'Select a track'}
          </p>
          {error ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-red-200">{error}</p>
              {currentTrack ? (
                <button
                  className="text-xs text-white/70 underline"
                  onClick={() =>
                    window.open(currentTrack.youtube_url, '_blank', 'noopener,noreferrer')
                  }
                >
                  Open
                </button>
              ) : null}
              <button
                className="text-xs text-white/70 underline"
                onClick={retryPlayer}
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-3 px-6">
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={playPrev}
              disabled={!canGoPrev}
              className="px-3 py-2"
              aria-label="Previous track"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5 3.2v9.6H3.5V3.2H5zm7.5 9.1-6.2-4.1 6.2-4.1v8.2z" />
              </svg>
            </Button>
            <Button onClick={togglePlay} className="px-4 py-2" aria-label="Play pause">
              {isPlaying ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5 3.5h3v11H5v-11zm5 0h3v11h-3v-11z" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4.5 3.5v11l9-5.5-9-5.5z" />
                </svg>
              )}
            </Button>
            <Button
              onClick={playNext}
              disabled={!canGoNext}
              className="px-3 py-2"
              aria-label="Next track"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
                className="rotate-180"
              >
                <path d="M5 3.2v9.6H3.5V3.2H5zm7.5 9.1-6.2-4.1 6.2-4.1v8.2z" />
              </svg>
            </Button>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={duration ? currentTime : 0}
            onChange={(event) => seekTo(Number(event.target.value))}
            className="w-full accent-white"
          />
          <div className="text-xs text-white/50">
            {Math.floor(currentTime)}s / {Math.floor(duration)}s
          </div>
        </div>
        <div className="flex min-w-[140px] items-center gap-3">
          <span className="text-xs text-white/50">Vol</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-full accent-white"
          />
        </div>
      </div>
    </div>
  )
}
