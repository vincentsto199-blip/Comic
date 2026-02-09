import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Track } from '../types'
import { createYouTubePlayer, extractYouTubeId, resetYouTubeApi } from '../lib/youtube'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  canGoNext: boolean
  canGoPrev: boolean
  error: string | null
  isReady: boolean
  playTrack: (track: Track) => void
  playQueue: (tracks: Track[], track: Track) => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  seekTo: (time: number) => void
  setVolume: (volume: number) => void
  retryPlayer: () => void
}

const PlayerContext = createContext<PlayerState | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(70)
  const [queue, setQueue] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const playerRef = useRef<YT.Player | null>(null)
  const pendingVideoIdRef = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const watchdog = setTimeout(() => {
      if (!isMounted || playerRef.current) return
      setError('YouTube player blocked. Disable adblock or open in YouTube.')
    }, 10000)

    createYouTubePlayer(
      'youtube-player',
      (event) => {
        if (event.data === window.YT?.PlayerState?.ENDED) {
          handlePlayNext()
        }
        if (event.data === window.YT?.PlayerState?.PLAYING) {
          setIsPlaying(true)
          setError(null)
        }
        if (
          event.data === window.YT?.PlayerState?.PAUSED ||
          event.data === window.YT?.PlayerState?.STOPPED
        ) {
          setIsPlaying(false)
        }
      },
      (event) => {
        const code = event.data
        const message =
          code === 150 || code === 153 || code === 101
            ? 'Embed blocked by YouTube. Open on YouTube.'
            : `YouTube error: ${code}`
        setError(message)
        setIsPlaying(false)
      },
    )
      .then((player) => {
        if (!isMounted) return
        playerRef.current = player
        const iframe = player.getIframe?.()
        if (iframe) {
          iframe.setAttribute(
            'referrerpolicy',
            'strict-origin-when-cross-origin',
          )
          iframe.setAttribute(
            'allow',
            'autoplay; encrypted-media; picture-in-picture',
          )
        }
        player.setVolume(volume)
        setIsReady(true)
        if (pendingVideoIdRef.current) {
          player.loadVideoById(pendingVideoIdRef.current)
          player.playVideo()
          setIsPlaying(true)
          pendingVideoIdRef.current = null
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setError(
          err instanceof Error
            ? err.message
            : 'YouTube API failed to load.',
        )
        setIsReady(false)
      })

    return () => {
      isMounted = false
      clearTimeout(watchdog)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [reloadKey])

  const playQueue = (tracks: Track[], track: Track) => {
    const index = Math.max(
      0,
      tracks.findIndex((item) => item.id === track.id),
    )
    setQueue(tracks)
    setCurrentIndex(index === -1 ? 0 : index)
    playTrackInternal(track)
  }

  const playTrackInternal = (track: Track) => {
    const videoId = extractYouTubeId(track.youtube_url)
    if (!videoId) {
      setError('Invalid YouTube URL for this track.')
      return
    }

    setError(null)
    setCurrentTrack(track)
    const player = playerRef.current
    if (player) {
      player.loadVideoById(videoId)
      player.playVideo()
      setIsPlaying(true)
    } else {
      pendingVideoIdRef.current = videoId
    }
  }

  const playTrack = (track: Track) => {
    playQueue([track], track)
  }

  const togglePlay = () => {
    const player = playerRef.current
    if (!player) return

    if (isPlaying) {
      player.pauseVideo()
      setIsPlaying(false)
    } else {
      player.playVideo()
      setIsPlaying(true)
    }
  }

  const handlePlayNext = () => {
    if (queue.length === 0) return
    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) return
    setCurrentIndex(nextIndex)
    playTrackInternal(queue[nextIndex])
  }

  const handlePlayPrev = () => {
    if (queue.length === 0) return
    const prevIndex = currentIndex - 1
    if (prevIndex < 0) return
    setCurrentIndex(prevIndex)
    playTrackInternal(queue[prevIndex])
  }

  const seekTo = (time: number) => {
    const player = playerRef.current
    if (!player) return
    player.seekTo(time, true)
    setCurrentTime(time)
  }

  const setVolume = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value))
    setVolumeState(clamped)
    const player = playerRef.current
    if (player) {
      player.setVolume(clamped)
    }
  }

  const retryPlayer = () => {
    resetYouTubeApi()
    setError(null)
    setIsReady(false)
    setReloadKey((prev) => prev + 1)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerRef.current
      if (!player) return
      const durationValue = player.getDuration?.() ?? 0
      const timeValue = player.getCurrentTime?.() ?? 0
      if (durationValue) {
        setDuration(durationValue)
      }
      setCurrentTime(timeValue)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const value = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      canGoNext: currentIndex < queue.length - 1,
      canGoPrev: currentIndex > 0,
      error,
      isReady,
      playTrack,
      playQueue,
      togglePlay,
      playNext: handlePlayNext,
      playPrev: handlePlayPrev,
      seekTo,
      setVolume,
      retryPlayer,
    }),
    [
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      currentIndex,
      queue,
      error,
      isReady,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <div className="fixed bottom-0 left-0 h-px w-px opacity-0">
        <div id="youtube-player" />
      </div>
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}
