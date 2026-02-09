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
import { usePlayer } from '../context/PlayerContext'
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
  const { playQueue } = usePlayer()
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

        const issuesRef = collection(firestore, 'issues')
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

        const soundtracksRef = collection(firestore, 'soundtracks')
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
            currentUserVote: 0,
          }
        })

        const withVotes = await Promise.all(
          mapped.map(async (soundtrack) => {
            if (!user) {
              return soundtrack
            }
            const voteRef = doc(
              firestore,
              'soundtracks',
              soundtrack.id,
              'votes',
              user.id,
            )
            const voteSnap = await getDoc(voteRef)
            const voteValue = voteSnap.exists()
              ? ((voteSnap.data().value as 1 | -1) ?? 0)
              : 0
            return {
              ...soundtrack,
              currentUserVote: voteValue,
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

  const handlePlay = (track: Track, tracks: Track[]) => {
    playQueue(tracks, track)
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">Issue details</p>
          <h2 className="text-2xl font-semibold">
            {issue.volume?.name ?? 'Untitled'} #{issue.issue_number}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Button onClick={() => setShowForm((prev) => !prev)}>
              {showForm ? 'Close' : '+ Add playlist'}
            </Button>
          ) : (
            <p className="text-sm text-white/50">Sign in to add a playlist.</p>
          )}
          <Button onClick={onBack}>Back to results</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="flex flex-col gap-4 p-4">
          {issue.image?.super_url ? (
            <img
              src={issue.image.super_url}
              alt={issue.name ?? 'Issue cover'}
              className="h-80 w-full rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-xl bg-ink-800 text-sm text-white/40">
              No cover
            </div>
          )}
          <div>
            <p className="text-lg font-semibold">
              {issue.name ?? 'Unnamed Issue'}
            </p>
            <p className="text-sm text-white/60">
              Cover date: {issue.cover_date ?? 'Unknown'}
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {error ? (
            <Card className="border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </Card>
          ) : null}
          {showForm ? (
            <Card className="flex flex-col gap-4 p-5">
              <div>
                <p className="text-sm font-semibold">
                  {editingSoundtrackId ? 'Edit playlist' : 'New playlist'}
                </p>
                <p className="text-xs text-white/60">
                  Add tracks with page ranges and YouTube links.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-xs text-white/60">Playlist title</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-sm focus:border-white/30 focus:outline-none"
                  value={playlistTitle}
                  onChange={(event) => setPlaylistTitle(event.target.value)}
                  placeholder="e.g. Noir city vibes"
                />
              </div>
              <div className="flex flex-col gap-4">
                {tracksDraft.map((track, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-4 md:grid-cols-2"
                  >
                    <input
                      className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                      value={track.title}
                      onChange={(event) =>
                        handleTrackChange(index, 'title', event.target.value)
                      }
                      placeholder="Track title"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                      value={track.youtube_url}
                      onChange={(event) =>
                        handleTrackChange(
                          index,
                          'youtube_url',
                          event.target.value,
                        )
                      }
                      placeholder="YouTube URL"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                      value={track.page_start}
                      onChange={(event) =>
                        handleTrackChange(
                          index,
                          'page_start',
                          event.target.value,
                        )
                      }
                      placeholder="Page start (optional)"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                      value={track.page_end}
                      onChange={(event) =>
                        handleTrackChange(
                          index,
                          'page_end',
                          event.target.value,
                        )
                      }
                      placeholder="Page end (optional)"
                    />
                    <div className="flex items-center justify-end md:col-span-2">
                      <Button
                        onClick={() => handleRemoveTrackRow(index)}
                        className="px-3 py-1.5 text-xs"
                      >
                        Remove track
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={handleAddTrackRow} className="self-start">
                  + Add another track
                </Button>
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={isSaving}
                  className="px-4 py-2"
                >
                  {isSaving
                    ? 'Saving...'
                    : editingSoundtrackId
                    ? 'Save changes'
                    : 'Publish playlist'}
                </Button>
              </div>
            </Card>
          ) : null}
          {isLoading ? (
            <Card className="p-6 text-sm text-white/60">
              Loading community soundtracks...
            </Card>
          ) : soundtracks.length > 0 ? (
            soundtracks.map((soundtrack) => (
              <SoundtrackCard
                key={soundtrack.id}
                soundtrack={soundtrack}
                onPlay={(track) => handlePlay(track, soundtrack.tracks)}
                onVote={handleVote}
                onEdit={handleEdit}
                currentUserId={user?.id}
              />
            ))
          ) : (
            <Card className="p-6 text-sm text-white/60">
              No soundtracks yet. Be the first to add one.
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
