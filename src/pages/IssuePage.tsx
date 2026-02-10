import { useEffect, useState } from 'react'
import type { ComicIssue } from '../lib/comicvine'
import { firebaseReady, firestore } from '../lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SoundtrackCard } from '../components/SoundtrackCard'
import { useAuth } from '../context/AuthContext'
import type { Soundtrack, Track } from '../types'

interface IssuePageProps {
  issue: ComicIssue
  onBack: () => void
}

export function IssuePage({ issue, onBack }: IssuePageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soundtracks, setSoundtracks] = useState<Soundtrack[]>([])
  const [showForm, setShowForm] = useState(false)
  const [playlistTitle, setPlaylistTitle] = useState('')
  const [tracksDraft, setTracksDraft] = useState<
    Array<{ title: string; youtube_url: string; page_start: string; page_end: string }>
  >([{ title: '', youtube_url: '', page_start: '', page_end: '' }])
  const [isSaving, setIsSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingSoundtrackId, setEditingSoundtrackId] = useState<string | null>(
    null,
  )
  const { user } = useAuth()

  useEffect(() => {
    let isMounted = true

    const loadSoundtracks = async () => {
      try {
        setIsLoading(true)
        setError(null)
        if (!firebaseReady || !firestore) {
          throw new Error('Missing Firebase configuration.')
        }
        const db = firestore

        const issuesRef = collection(db, 'issues')
        const issueQuery = query(
          issuesRef,
          where('comicvine_issue_id', '==', String(issue.id)),
          limit(1),
        )
        const issueSnapshot = await getDocs(issueQuery)
        let issueDocId: string

        if (issueSnapshot.empty) {
          const newIssueRef = doc(issuesRef)
          await setDoc(newIssueRef, {
            comicvine_issue_id: String(issue.id),
            title: `${issue.volume?.name ?? 'Untitled'} #${issue.issue_number}`,
            cover_url: issue.image?.super_url ?? issue.image?.small_url ?? null,
            created_at: serverTimestamp(),
          })
          issueDocId = newIssueRef.id
        } else {
          issueDocId = issueSnapshot.docs[0].id
        }

        const soundtracksRef = collection(db, 'soundtracks')
        const soundtracksQuery = query(
          soundtracksRef,
          where('issue_id', '==', issueDocId),
          orderBy('votes_count', 'desc'),
        )
        const soundtracksSnapshot = await getDocs(soundtracksQuery)

        const mapped = soundtracksSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            title?: string
            created_at?: string
            tracks?: Track[]
            votes_count?: number
            upvotes?: number
            downvotes?: number
            user_id?: string
            user_name?: string
          }
          return {
            id: docSnap.id,
            title: data.title ?? 'Untitled soundtrack',
            created_at: data.created_at ?? '',
            tracks: (data.tracks ?? []).sort(
              (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
            ),
            votes: data.votes_count ?? 0,
            upvotes: data.upvotes ?? 0,
            downvotes: data.downvotes ?? 0,
            user_id: data.user_id ?? 'unknown',
            user_name: data.user_name ?? 'Anonymous',
            currentUserVote: 0 as 0,
          }
        })

        const withVotes = await Promise.all(
          mapped.map(async (soundtrack) => {
            if (!user) {
              return soundtrack
            }
            const voteRef = doc(
              db,
              'soundtracks',
              soundtrack.id,
              'votes',
              user.id,
            )
            const voteSnap = await getDoc(voteRef)
            const voteValue = voteSnap.exists()
              ? ((voteSnap.data().value as 1 | -1 | 0) ?? 0)
              : 0
            return {
              ...soundtrack,
              currentUserVote: voteValue as 1 | -1 | 0,
            }
          }),
        )

        withVotes.sort((a, b) => b.votes - a.votes)

        if (isMounted) {
          setSoundtracks(withVotes)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSoundtracks()

    return () => {
      isMounted = false
    }
  }, [issue, refreshKey, user])

  const handlePlay = (track: Track) => {
    window.open(track.youtube_url, '_blank', 'noopener,noreferrer')
  }

  const handleAddTrackRow = () => {
    setTracksDraft((prev) => [
      ...prev,
      { title: '', youtube_url: '', page_start: '', page_end: '' },
    ])
  }

  const handleRemoveTrackRow = (index: number) => {
    setTracksDraft((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleTrackChange = (
    index: number,
    field: 'title' | 'youtube_url' | 'page_start' | 'page_end',
    value: string,
  ) => {
    setTracksDraft((prev) =>
      prev.map((track, idx) =>
        idx === index ? { ...track, [field]: value } : track,
      ),
    )
  }

  const handleCreatePlaylist = async () => {
    if (!firestore || !firebaseReady || !user) {
      setError('You must be signed in to add a playlist.')
      return
    }

    const cleanedTracks = tracksDraft
      .map((track, index) => ({
        id: `${Date.now()}-${index}`,
        title: track.title.trim(),
        youtube_url: track.youtube_url.trim(),
        page_start: track.page_start ? Number(track.page_start) : null,
        page_end: track.page_end ? Number(track.page_end) : null,
        order_index: index,
      }))
      .filter((track) => track.title && track.youtube_url)

    if (!playlistTitle.trim()) {
      setError('Please enter a playlist title.')
      return
    }

    if (cleanedTracks.length === 0) {
      setError('Please add at least one track with a YouTube URL.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const issuesRef = collection(firestore, 'issues')
      const issueQuery = query(
        issuesRef,
        where('comicvine_issue_id', '==', String(issue.id)),
        limit(1),
      )
      const issueSnapshot = await getDocs(issueQuery)
      const issueDocId = issueSnapshot.empty
        ? (await (async () => {
            const newIssueRef = doc(issuesRef)
            await setDoc(newIssueRef, {
              comicvine_issue_id: String(issue.id),
              title: `${issue.volume?.name ?? 'Untitled'} #${issue.issue_number}`,
              cover_url: issue.image?.super_url ?? issue.image?.small_url ?? null,
              created_at: serverTimestamp(),
            })
            return newIssueRef.id
          })())
        : issueSnapshot.docs[0].id

      const soundtracksRef = collection(firestore, 'soundtracks')
      if (editingSoundtrackId) {
        await updateDoc(doc(firestore, 'soundtracks', editingSoundtrackId), {
          title: playlistTitle.trim(),
          tracks: cleanedTracks,
          updated_at: serverTimestamp(),
        })
      } else {
        await setDoc(doc(soundtracksRef), {
          issue_id: issueDocId,
          title: playlistTitle.trim(),
          tracks: cleanedTracks,
          created_at: serverTimestamp(),
          user_id: user.id,
          user_name: user.name ?? user.email ?? 'User',
          votes_count: 0,
          upvotes: 0,
          downvotes: 0,
        })
      }

      setPlaylistTitle('')
      setTracksDraft([{ title: '', youtube_url: '', page_start: '', page_end: '' }])
      setShowForm(false)
      setEditingSoundtrackId(null)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save playlist.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVote = async (soundtrack: Soundtrack, value: 1 | -1) => {
    if (!firestore || !user) {
      setError('Please sign in to vote.')
      return
    }

    const voteRef = doc(
      firestore,
      'soundtracks',
      soundtrack.id,
      'votes',
      user.id,
    )
    const soundtrackRef = doc(firestore, 'soundtracks', soundtrack.id)

    await runTransaction(firestore, async (transaction) => {
      const voteSnap = await transaction.get(voteRef)
      const soundtrackSnap = await transaction.get(soundtrackRef)
      if (!soundtrackSnap.exists()) {
        throw new Error('Soundtrack not found.')
      }
      const data = soundtrackSnap.data() as {
        votes_count?: number
        upvotes?: number
        downvotes?: number
      }
      let votesCount = data.votes_count ?? 0
      let upvotes = data.upvotes ?? 0
      let downvotes = data.downvotes ?? 0

      if (voteSnap.exists()) {
        const existing = voteSnap.data() as { value: 1 | -1 }
        if (existing.value === value) {
          transaction.delete(voteRef)
          votesCount -= value
          if (value === 1) upvotes -= 1
          if (value === -1) downvotes -= 1
        } else {
          transaction.set(voteRef, { value })
          votesCount += value * 2
          if (value === 1) {
            upvotes += 1
            downvotes -= 1
          } else {
            downvotes += 1
            upvotes -= 1
          }
        }
      } else {
        transaction.set(voteRef, { value })
        votesCount += value
        if (value === 1) upvotes += 1
        if (value === -1) downvotes += 1
      }

      transaction.update(soundtrackRef, {
        votes_count: votesCount,
        upvotes,
        downvotes,
      })
    })
    setRefreshKey((prev) => prev + 1)
  }


  const handleEdit = (soundtrack: Soundtrack) => {
    if (!user || soundtrack.user_id !== user.id) {
      return
    }
    setEditingSoundtrackId(soundtrack.id)
    setPlaylistTitle(soundtrack.title)
    setTracksDraft(
      soundtrack.tracks.map((track) => ({
        title: track.title,
        youtube_url: track.youtube_url,
        page_start: track.page_start ? String(track.page_start) : '',
        page_end: track.page_end ? String(track.page_end) : '',
      })),
    )
    setShowForm(true)
  }

  const formInputClass =
    'w-full rounded-lg border border-white/[0.08] bg-ink-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 transition-colors duration-200 focus:border-accent-blue/40 focus:bg-ink-800 focus:outline-none focus:ring-1 focus:ring-accent-blue/20'

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/50 transition-all duration-200 hover:bg-white/[0.08] hover:text-white cursor-pointer"
            aria-label="Back to results"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-accent-red/80">Issue</p>
            <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              {issue.volume?.name ?? 'Untitled'} <span className="text-white/40">#{issue.issue_number}</span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Button
              variant="primary"
              onClick={() => {
                if (showForm && !editingSoundtrackId) {
                  setShowForm(false)
                } else {
                  setEditingSoundtrackId(null)
                  setPlaylistTitle('')
                  setTracksDraft([{ title: '', youtube_url: '', page_start: '', page_end: '' }])
                  setShowForm(true)
                }
              }}
              className="text-sm"
            >
              {showForm && !editingSoundtrackId ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add playlist
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm text-white/30">Sign in to add a playlist</p>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Left: Cover card */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-ink-900/60 shadow-xl shadow-black/30">
            {issue.image?.super_url ? (
              <img
                src={issue.image.super_url}
                alt={issue.name ?? 'Issue cover'}
                className="w-full object-cover aspect-[2/3]"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center bg-ink-800 text-sm text-white/30">
                No cover
              </div>
            )}
          </div>
          <div className="px-1">
            <p className="text-base font-semibold text-white/90">
              {issue.name ?? 'Unnamed Issue'}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {issue.cover_date ?? 'Unknown date'}
            </p>
          </div>
        </div>

        {/* Right: Soundtracks column */}
        <div className="flex flex-col gap-4">
          {error ? (
            <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 p-4 text-sm text-red-200 animate-fade-in-fast">
              {error}
            </div>
          ) : null}

          {/* Playlist form */}
          {showForm ? (
            <Card className="flex flex-col gap-5 p-6 animate-scale-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {editingSoundtrackId ? 'Edit playlist' : 'New playlist'}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Add tracks with page ranges and YouTube links.
                  </p>
                </div>
                {editingSoundtrackId ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingSoundtrackId(null)
                      setPlaylistTitle('')
                      setTracksDraft([{ title: '', youtube_url: '', page_start: '', page_end: '' }])
                      setShowForm(false)
                    }}
                    className="text-xs text-white/40"
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/50">Playlist title</label>
                <input
                  className={formInputClass}
                  value={playlistTitle}
                  onChange={(event) => setPlaylistTitle(event.target.value)}
                  placeholder="e.g. Noir city vibes"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-white/50">Tracks</label>
                {tracksDraft.map((track, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-white/[0.06] bg-ink-950/40 p-4 animate-fade-in-fast"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-white/30">Track {index + 1}</span>
                      <button
                        onClick={() => handleRemoveTrackRow(index)}
                        className="text-xs text-white/30 hover:text-accent-red transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-2.5 md:grid-cols-2">
                      <input
                        className={formInputClass}
                        value={track.title}
                        onChange={(event) =>
                          handleTrackChange(index, 'title', event.target.value)
                        }
                        placeholder="Track title"
                      />
                      <input
                        className={formInputClass}
                        value={track.youtube_url}
                        onChange={(event) =>
                          handleTrackChange(index, 'youtube_url', event.target.value)
                        }
                        placeholder="YouTube URL"
                      />
                      <input
                        className={formInputClass}
                        value={track.page_start}
                        onChange={(event) =>
                          handleTrackChange(index, 'page_start', event.target.value)
                        }
                        placeholder="Page start (optional)"
                      />
                      <input
                        className={formInputClass}
                        value={track.page_end}
                        onChange={(event) =>
                          handleTrackChange(index, 'page_end', event.target.value)
                        }
                        placeholder="Page end (optional)"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAddTrackRow}
                  className="flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-medium text-accent-blue hover:bg-accent-blue/10 transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add another track
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.05]">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false)
                    setEditingSoundtrackId(null)
                  }}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreatePlaylist}
                  disabled={isSaving}
                  className="px-5 py-2 text-sm"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving
                    </span>
                  ) : editingSoundtrackId ? 'Save changes' : 'Publish playlist'}
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Soundtracks list */}
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-white/[0.05] bg-ink-900/40 p-5 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-white/[0.06] mb-3" />
                  <div className="h-3 w-1/4 rounded bg-white/[0.04] mb-4" />
                  <div className="h-12 w-full rounded bg-white/[0.03]" />
                </div>
              ))}
            </div>
          ) : soundtracks.length > 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-medium uppercase tracking-wider text-white/25">
                Community Soundtracks ({soundtracks.length})
              </p>
              {soundtracks.map((soundtrack, idx) => (
                <div key={soundtrack.id} className="animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                  <SoundtrackCard
                    soundtrack={soundtrack}
                    onPlay={(track) => handlePlay(track)}
                    onVote={handleVote}
                    onEdit={handleEdit}
                    currentUserId={user?.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                  <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="text-sm text-white/40">No soundtracks yet</p>
              <p className="text-xs text-white/25">Be the first to add one for this issue.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
