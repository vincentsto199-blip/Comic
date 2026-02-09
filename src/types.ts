export interface Track {
  id: string
  title: string
  youtube_url: string
  page_start: number | null
  page_end: number | null
  order_index: number | null
}

export interface Soundtrack {
  id: string
  title: string
  created_at: string
  tracks: Track[]
  votes: number
  upvotes: number
  downvotes: number
  user_id: string
  user_name: string
  currentUserVote: 1 | -1 | 0
}
