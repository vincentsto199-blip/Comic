import { useEffect, useRef, useState } from 'react'
import { Card } from './ui/Card'
import type { Soundtrack, SoundtrackComment, Track } from '../types'
import { TrackRow } from './TrackRow'
import { useAuth } from '../context/AuthContext'
import { firebaseReady, firestore } from '../lib/firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'

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
  const { user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<SoundtrackComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [isSavingComment, setIsSavingComment] = useState(false)

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

  const loadComments = async () => {
    if (!firebaseReady || !firestore) {
      setCommentError('Comments are unavailable right now.')
      return
    }
    setIsLoadingComments(true)
    setCommentError(null)
    try {
      const commentsRef = collection(
        firestore,
        'soundtracks',
        soundtrack.id,
        'comments',
      )
      const commentsQuery = query(commentsRef, orderBy('created_at', 'desc'))
      const snapshot = await getDocs(commentsQuery)
      const mapped = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          text?: string
          user_id?: string
          user_name?: string
          created_at?: { toDate?: () => Date }
        }
        const createdAt = data.created_at?.toDate?.() ?? new Date()
        return {
          id: docSnap.id,
          text: data.text ?? '',
          user_id: data.user_id ?? 'unknown',
          user_name: data.user_name ?? 'Anonymous',
          created_at: createdAt.toLocaleDateString(),
        }
      })
      setComments(mapped)
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to load comments.')
    } finally {
      setIsLoadingComments(false)
    }
  }

  useEffect(() => {
    if (showComments) {
      loadComments()
    }
  }, [showComments])

  const handleAddComment = async () => {
    if (!user) {
      setCommentError('Sign in to comment.')
      return
    }
    if (!commentText.trim()) return
    if (!firebaseReady || !firestore) {
      setCommentError('Comments are unavailable right now.')
      return
    }

    setIsSavingComment(true)
    setCommentError(null)
    try {
      const commentsRef = collection(
        firestore,
        'soundtracks',
        soundtrack.id,
        'comments',
      )
      await addDoc(commentsRef, {
        text: commentText.trim(),
        user_id: user.id,
        user_name: user.name ?? user.email ?? 'User',
        created_at: serverTimestamp(),
      })
      setCommentText('')
      await loadComments()
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to post comment.')
    } finally {
      setIsSavingComment(false)
    }
  }

  const handleDeleteComment = async (comment: SoundtrackComment) => {
    if (!user || comment.user_id !== user.id) {
      return
    }
    if (!firebaseReady || !firestore) return

    try {
      await deleteDoc(
        doc(firestore, 'soundtracks', soundtrack.id, 'comments', comment.id),
      )
      await loadComments()
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to delete comment.')
    }
  }

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-red/15 text-accent-red flex-shrink-0">
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
          <button
            onClick={() => setShowComments((prev) => !prev)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
              showComments
                ? 'bg-white/[0.08] text-white'
                : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Comments{comments.length > 0 ? ` (${comments.length})` : ''}
          </button>
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
      {showComments ? (
        <div className="border-t border-white/[0.04] px-5 py-4">
          <div className="flex flex-col gap-3">
            {commentError ? (
              <p className="text-xs text-accent-red">{commentError}</p>
            ) : null}
            {isLoadingComments ? (
              <p className="text-xs text-white/40">Loading comments...</p>
            ) : comments.length > 0 ? (
              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-white/70">
                        {comment.user_name}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/30">
                          {comment.created_at}
                        </span>
                        {user && comment.user_id === user.id ? (
                          <button
                            onClick={() => handleDeleteComment(comment)}
                            className="text-[10px] text-white/30 hover:text-accent-red"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-white/60">{comment.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">No comments yet.</p>
            )}
            <div className="flex flex-col gap-2">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder={user ? 'Write a comment...' : 'Sign in to comment.'}
                disabled={!user || isSavingComment}
                className="min-h-[70px] w-full resize-none rounded-lg border border-white/[0.08] bg-ink-900/60 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-accent-red/35 focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={!user || isSavingComment || !commentText.trim()}
                  className="rounded-lg bg-accent-red px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {isSavingComment ? 'Posting...' : 'Post comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
