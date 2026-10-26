'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, ChevronLeft, ChevronRight, Send, MessageCircle, Loader2, Bookmark, Heart } from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { UserAvatar } from '@/components/fc/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface StoryItem {
  id: string
  type: 'text' | 'image'
  content: string
  bg: string | null
  createdAt: string
  expiresAt: string
  viewedByMe: boolean
  viewCount: number
  isHighlight: boolean
  // Round 8: reaction count + the emoji the current user reacted with
  // (null when the user hasn't reacted). Both come from the GET /api/stories
  // response — see the round-8 backend worklog entry.
  reactionCount?: number
  myReaction?: string | null
}

export interface StoryViewerUser {
  userId: string
  name: string
  photoUrl: string | null
  isMe: boolean
}

export interface StoryReply {
  id: string
  userId: string
  userName: string
  userPhoto: string | null
  content: string
  createdAt: string
}

// Round 8: a single emoji reaction on a story (returned by
// GET /api/stories/[id]/reactions). Used to populate the "view who reacted"
// popover shown on the user's OWN story.
export interface StoryReaction {
  id: string
  userId: string
  userName: string
  userPhoto: string | null
  emoji: string
  createdAt: string
}

// Round 9: a single story view entry (returned by GET /api/stories/[id]/views).
// Owner-only — used to populate the "view who viewed" popover shown on the
// user's OWN story. Mirrors the StoryReaction shape (minus the emoji).
export interface StoryViewEntry {
  id: string
  userId: string
  userName: string
  username: string
  userPhoto: string | null
  viewedAt: string
}

// Round 8: quick-reaction emojis offered above the reply input on someone
// else's story. Matches the spec list exactly (❤️😂🔥👏😮😢).
const STORY_QUICK_REACTIONS = ['❤️', '😂', '🔥', '👏', '😮', '😢'] as const

interface StoryViewerProps {
  stories: StoryItem[]
  user: StoryViewerUser
  onClose: () => void
  onNavigate?: (userId: string) => void
  /** Optional starting index (used when opening the viewer on a specific highlight). */
  startIndex?: number
  /** Notifies the parent when a story's highlight flag is toggled (so it can refresh). */
  onHighlightChange?: (storyId: string, isHighlight: boolean) => void
}

const STORY_DURATION_MS = 5000

/**
 * Full-screen story viewer modal.
 * - Progress bars at top (one per story, active fills over ~5s)
 * - Auto-advance to next story after 5s; after last, close
 * - Tap left/right thirds to go prev/next, center third to close
 * - Text stories: full-screen centered text on `bg` background (gradient fallback)
 * - Image stories: full-screen <img object-contain>
 * - Header: avatar + name + timeAgo + close. If isMe, shows viewCount.
 * - On viewing each story for the first time: POST /api/stories/[id]/view
 * - Keyboard: Escape to close, ArrowLeft/ArrowRight to navigate
 */
export function StoryViewer({ stories, user, onClose, startIndex, onHighlightChange }: StoryViewerProps) {
  const [index, setIndex] = useState(() => {
    if (typeof startIndex === 'number' && startIndex >= 0 && startIndex < stories.length) {
      return startIndex
    }
    return 0
  })
  const [imgError, setImgError] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [replies, setReplies] = useState<StoryReply[]>([])
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [paused, setPaused] = useState(false)
  // Local override map for the highlight flag — keeps the icon in sync immediately
  // after a toggle, before the parent refetches the stories list.
  const [highlightOverrides, setHighlightOverrides] = useState<Record<string, boolean>>({})
  const [highlightBusy, setHighlightBusy] = useState(false)
  // Round 8: story reactions. `myReaction` is a local override for the
  // active story's my-reaction emoji — set optimistically on tap and
  // reconciled when the active story changes (via the effect below).
  // `reactionList` is the fresh list of reactions (with avatars + emoji)
  // fetched for the user's OWN story so they can see who reacted.
  const [myReaction, setMyReaction] = useState<string | null>(null)
  const [reactionList, setReactionList] = useState<StoryReaction[]>([])
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [loadingReactions, setLoadingReactions] = useState(false)
  const [reacting, setReacting] = useState(false)
  // Round 9: story views list (own story only). `views` is the fresh list of
  // viewers (with avatars + viewedAt) fetched from
  // GET /api/stories/[id]/views so the owner can see exactly who viewed the
  // active story. `viewsOpen` toggles the popover anchored under the views
  // pill in the header.
  const [views, setViews] = useState<StoryViewEntry[]>([])
  const [viewsOpen, setViewsOpen] = useState(false)
  const [loadingViews, setLoadingViews] = useState(false)
  const viewedRef = useRef<Set<string>>(new Set())
  const touchStartX = useRef<number | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const pausedAtRef = useRef<number | null>(null)
  const pausedAccRef = useRef<number>(0)
  const pausedRef = useRef(false)
  const goNextRef = useRef<() => void>(() => {})

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= stories.length) {
        onClose()
        return i
      }
      return i + 1
    })
  }, [stories.length, onClose])

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  // Reset image error state when index changes
  useEffect(() => {
    setImgError(false)
  }, [index])

  // Reset reply text + close replies popover when story changes
  useEffect(() => {
    setReplyText('')
    setRepliesOpen(false)
  }, [index])

  // Mark the active story as viewed (once per story id)
  useEffect(() => {
    const story = stories[index]
    if (!story) return
    if (viewedRef.current.has(story.id)) return
    viewedRef.current.add(story.id)
    api(`/api/stories/${story.id}/view`, { method: 'POST' }).catch(() => {
      /* silent — view tracking is best-effort */
    })
  }, [index, stories])

  // Keep refs in sync (used by the rAF auto-advance timer)
  useEffect(() => {
    goNextRef.current = goNext
  }, [goNext])
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // Fetch replies when viewing own story (and when story changes)
  useEffect(() => {
    if (!user.isMe) {
      setReplies([])
      return
    }
    const story = stories[index]
    if (!story) return
    let cancelled = false
    setLoadingReplies(true)
    api<{ replies: StoryReply[] }>(`/api/stories/${story.id}/replies`)
      .then((data) => {
        if (!cancelled) setReplies(data.replies)
      })
      .catch(() => {
        if (!cancelled) setReplies([])
      })
      .finally(() => {
        if (!cancelled) setLoadingReplies(false)
      })
    return () => {
      cancelled = true
    }
  }, [index, user.isMe, stories])

  // Round 8: reconcile the local `myReaction` override with the active
  // story's `myReaction` from the API whenever the active story changes.
  // The override is set optimistically on tap and is otherwise synced from
  // the parent's stories prop (which is the source of truth from GET /api/stories).
  useEffect(() => {
    const story = stories[index]
    if (!story) return
    setMyReaction(story.myReaction ?? null)
    setReactionsOpen(false)
  }, [index, stories])

  // Round 9: collapse the views popover when the active story changes so a
  // stale popover doesn't bleed into the next story. Mirrors the
  // reactions/replies reset-on-change pattern above.
  useEffect(() => {
    setViewsOpen(false)
  }, [index])

  // Round 8: fetch the full reactions list (with avatars + emoji) for the
  // user's OWN story so they can see who reacted. Mirrors the replies fetch
  // above. For other users' stories we don't fetch (their reactions are
  // private — only the count is shown in the header pill).
  useEffect(() => {
    if (!user.isMe) {
      setReactionList([])
      return
    }
    const story = stories[index]
    if (!story) return
    let cancelled = false
    setLoadingReactions(true)
    api<{ reactions: StoryReaction[] }>(`/api/stories/${story.id}/reactions`)
      .then((data) => {
        if (!cancelled) setReactionList(data.reactions || [])
      })
      .catch(() => {
        if (!cancelled) setReactionList([])
      })
      .finally(() => {
        if (!cancelled) setLoadingReactions(false)
      })
    return () => {
      cancelled = true
    }
  }, [index, user.isMe, stories])

  // Round 9: fetch the full views list (with avatars + viewedAt) for the
  // user's OWN story so they can see exactly who viewed it. Mirrors the
  // reactions fetch above (owner-only — backend returns 403 for non-owners).
  useEffect(() => {
    if (!user.isMe) {
      setViews([])
      return
    }
    const story = stories[index]
    if (!story) return
    let cancelled = false
    setLoadingViews(true)
    api<{ views: StoryViewEntry[] }>(`/api/stories/${story.id}/views`)
      .then((data) => {
        if (!cancelled) setViews(data.views || [])
      })
      .catch(() => {
        if (!cancelled) setViews([])
      })
      .finally(() => {
        if (!cancelled) setLoadingViews(false)
      })
    return () => {
      cancelled = true
    }
  }, [index, user.isMe, stories])

  // Auto-advance timer using requestAnimationFrame (pauses while the reply input is focused).
  // Replaces the previous framer-motion progress bar so we can cleanly pause/resume on input focus.
  useEffect(() => {
    startRef.current = Date.now()
    pausedAtRef.current = pausedRef.current ? Date.now() : null
    pausedAccRef.current = 0
    if (progressBarRef.current) progressBarRef.current.style.width = '0%'

    const tick = () => {
      if (pausedAtRef.current === null) {
        const elapsed = Date.now() - startRef.current - pausedAccRef.current
        const p = Math.min(1, elapsed / STORY_DURATION_MS)
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${p * 100}%`
        }
        if (p >= 1) {
          goNextRef.current()
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [index])

  // Pause/resume handler (driven by reply input focus)
  useEffect(() => {
    if (paused) {
      pausedAtRef.current = Date.now()
    } else if (pausedAtRef.current !== null) {
      pausedAccRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
    }
  }, [paused])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goNext, goPrev])

  // Touch swipe support (left = next, right = prev, down = close)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) goNext()
    else goPrev()
  }

  // Post a reply to the current story (friends only — backend enforces).
  const handleSendReply = useCallback(async () => {
    const story = stories[index]
    if (!story) return
    const content = replyText.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const data = await api<{ reply: StoryReply }>(`/api/stories/${story.id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      // If we happen to be viewing our own story, surface our own reply in the list.
      if (user.isMe) {
        setReplies((prev) => [...prev, data.reply])
      }
      setReplyText('')
      toast.success('Reply sent')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }, [stories, index, replyText, sending, user.isMe])

  // Toggle highlight on the current story (owner only). Optimistic local update
  // so the bookmark icon flips immediately; the parent is notified so it can
  // refresh its stories list (the highlighted story moves between the
  // "stories" and "highlights" buckets on the next fetch).
  const handleToggleHighlight = useCallback(async () => {
    const story = stories[index]
    if (!story || highlightBusy) return
    const next = !(highlightOverrides[story.id] ?? story.isHighlight)
    setHighlightOverrides((prev) => ({ ...prev, [story.id]: next }))
    setHighlightBusy(true)
    try {
      await api(`/api/stories/${story.id}/highlight`, {
        method: 'POST',
        body: JSON.stringify({ highlight: next }),
      })
      toast.success(next ? 'Added to highlights' : 'Removed from highlights')
      onHighlightChange?.(story.id, next)
    } catch (e: any) {
      // Revert the optimistic update.
      setHighlightOverrides((prev) => ({ ...prev, [story.id]: !next }))
      toast.error(e?.message || 'Failed to toggle highlight')
    } finally {
      setHighlightBusy(false)
    }
  }, [stories, index, highlightOverrides, highlightBusy, onHighlightChange])

  // Round 8: react to the current story with an emoji. The backend upserts
  // (one reaction per user per story — replaces any existing reaction by me).
  // We update the local `myReaction` state optimistically so the active emoji
  // flips immediately; on error we revert. Tapping the same emoji again is a
  // no-op visually but still POSTs (the backend re-creates the same reaction —
  // harmless + idempotent). Doesn't pause the auto-advance timer (reactions
  // are quick taps, the user has 5s to react before the story advances).
  const handleReact = useCallback(async (emoji: string) => {
    const story = stories[index]
    if (!story || reacting) return
    const prev = myReaction
    setMyReaction(emoji)
    setReacting(true)
    try {
      await api(`/api/stories/${story.id}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
      toast.success('Reacted')
      // If we're viewing our own story, surface our own reaction in the
      // popover list. The fresh GET /api/stories/[id]/reactions effect will
      // reconcile on the next story change anyway, but this keeps the list
      // in sync immediately so the count + popover are accurate right now.
      if (user.isMe) {
        setReactionList((prevList) => {
          // Remove any existing reaction by me, then add the new one.
          const filtered = prevList.filter((r) => r.userId !== user.userId)
          return [
            ...filtered,
            {
              id: `local-${story.id}-${user.userId}`,
              userId: user.userId,
              userName: user.name,
              userPhoto: user.photoUrl,
              emoji,
              createdAt: new Date().toISOString(),
            },
          ]
        })
      }
    } catch (e: any) {
      setMyReaction(prev)
      toast.error(e?.message || 'Failed to react')
    } finally {
      setReacting(false)
    }
  }, [stories, index, reacting, myReaction, user.isMe, user.userId, user.name, user.photoUrl])

  if (!stories.length) {
    return null
  }

  const current = stories[index]
  if (!current) return null

  const bgStyle = current.bg || 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
  const isHighlighted = highlightOverrides[current.id] ?? current.isHighlight

  // Round 8: derived reaction count for the header pill. For own stories we
  // prefer the fresh reactions-list length (the GET /api/stories/[id]/reactions
  // fetch); for other users' stories we adjust the API count for the local
  // myReaction override so the pill flips to N+1 immediately on first react.
  // Declared here (BEFORE the JSX) to avoid a temporal-dead-zone warning.
  const headerReactionCount = user.isMe
    ? Math.max(reactionList.length, current.reactionCount || 0)
    : (current.reactionCount || 0) + (myReaction && !current.myReaction ? 1 : 0)

  // Round 9: derived views count for the header pill (own story only).
  // Prefers the fresh views-list length (from GET /api/stories/[id]/views)
  // over the API count embedded in the story object so the pill is accurate
  // even if the parent's stories prop is stale. Declared here (BEFORE the
  // JSX) to avoid a temporal-dead-zone warning.
  const headerViewsCount = user.isMe
    ? Math.max(views.length, current.viewCount || 0)
    : current.viewCount || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[90] bg-black select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Story content (crossfades between stories) */}
      <AnimatePresence>
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0"
        >
          {current.type === 'image' && !imgError ? (
            <img
              src={current.content}
              alt={user.name ? `${user.name}'s story` : 'Story'}
              className="h-full w-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : current.type === 'image' && imgError ? (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center"
              style={{ background: 'linear-gradient(135deg, #1f1f23, #000000)' }}
            >
              <p className="text-lg font-semibold text-white">Image unavailable</p>
              <p className="text-sm text-white/60">This story media could not be loaded.</p>
            </div>
          ) : (
            <div
              className="flex h-full w-full items-center justify-center p-8"
              style={{ background: bgStyle }}
            >
              <p className="whitespace-pre-wrap break-words text-center text-2xl font-bold leading-snug text-white drop-shadow-sm sm:text-3xl md:text-4xl">
                {current.content}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tap zones (left = prev, center = close, right = next) */}
      <div className="absolute inset-0 z-10 flex">
        <button
          type="button"
          aria-label="Previous story"
          onClick={goPrev}
          className="h-full w-1/3 cursor-pointer"
        />
        <button
          type="button"
          aria-label="Close story viewer"
          onClick={onClose}
          className="h-full w-1/3 cursor-pointer"
        />
        <button
          type="button"
          aria-label="Next story"
          onClick={goNext}
          className="h-full w-1/3 cursor-pointer"
        />
      </div>

      {/* Progress bars */}
      <div className="fc-safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
        {stories.map((s, i) => (
          <div
            key={s.id}
            className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
          >
            {i < index ? (
              <div className="h-full w-full bg-white" />
            ) : i === index ? (
              <div
                ref={progressBarRef}
                className="h-full bg-white"
                style={{ width: '0%' }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Header: avatar + name + views (if me) + reactions + time + close */}
      <div className="fc-safe-top pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-4 pt-7">
        <div className="pointer-events-auto">
          <UserAvatar name={user.name} src={user.photoUrl} size={38} />
        </div>
        <div className="pointer-events-auto min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-semibold text-white drop-shadow-sm">
              {user.name}
            </span>
            {/* Round 9: views pill (own story only). Made tappable to open a
                popover listing every viewer with their avatar + timeAgo.
                Anchored under the pill so it never overlaps the bottom-area
                replies/reactions popovers (which sit above the reply bar). */}
            {user.isMe && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setViewsOpen((v) => !v)}
                  aria-expanded={viewsOpen}
                  aria-label="View story viewers"
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
                >
                  <Eye size={11} />
                  {headerViewsCount} {headerViewsCount === 1 ? 'view' : 'views'}
                  {viewsOpen ? <X size={11} /> : null}
                </button>
                <AnimatePresence>
                  {viewsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="fc-scroll absolute left-0 top-full z-40 mt-2 max-h-72 w-64 max-w-[80vw] overflow-y-auto rounded-xl bg-black/80 p-2 backdrop-blur"
                    >
                      {loadingViews && views.length === 0 ? (
                        <div className="grid place-items-center py-8">
                          <Loader2 size={20} className="animate-spin text-white/70" />
                        </div>
                      ) : views.length === 0 ? (
                        <div className="grid place-items-center gap-2 py-8 text-center text-sm text-white/60">
                          <Eye size={24} className="opacity-50" />
                          No views yet
                        </div>
                      ) : (
                        <ul className="space-y-0.5">
                          {views.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/5"
                            >
                              <UserAvatar name={v.userName} src={v.userPhoto} size={32} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-semibold text-white">
                                  {v.userName}
                                </div>
                                <div className="truncate text-[10px] text-white/60">
                                  @{v.username}
                                </div>
                              </div>
                              <span className="shrink-0 text-[10px] text-white/50">
                                {timeAgo(v.viewedAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {/* Round 8: small reaction-count pill next to the views pill.
                Shown to everyone when there's at least one reaction. */}
            {headerReactionCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                <Heart size={11} className="fill-current" />
                {headerReactionCount}
              </span>
            )}
            <span className="text-xs text-white/70 drop-shadow-sm">
              {timeAgo(current.createdAt)}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white active:scale-95"
        >
          <X size={22} />
        </button>
      </div>

      {/* Highlight toggle (own stories only) — sits to the left of the close button */}
      {user.isMe && (
        <button
          type="button"
          onClick={handleToggleHighlight}
          disabled={highlightBusy}
          aria-label={isHighlighted ? 'Remove from highlights' : 'Add to highlights'}
          aria-pressed={isHighlighted}
          title={isHighlighted ? 'Remove from highlights' : 'Add to highlights'}
          className="absolute right-16 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-95 disabled:opacity-60"
        >
          {highlightBusy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Bookmark
              size={16}
              className={cn(isHighlighted && 'fill-current text-primary')}
            />
          )}
        </button>
      )}

      {/* Side nav arrows (desktop / large screens) */}
      <button
        type="button"
        aria-label="Previous"
        onClick={goPrev}
        className={cn(
          'absolute left-2 top-1/2 z-30 hidden -translate-y-1/2 place-items-center rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95 md:grid',
          index === 0 && 'pointer-events-none opacity-0'
        )}
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={goNext}
        className="absolute right-2 top-1/2 z-30 hidden -translate-y-1/2 place-items-center rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95 md:grid"
      >
        <ChevronRight size={22} />
      </button>

      {/* Subtle bottom gradient for legibility on image stories */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Round 8: story reaction bar (others' stories only). Renders a pill of
          6 quick-reaction emojis ABOVE the reply input. Tapping one POSTs to
          /api/stories/[id]/reactions { emoji } and flips the local myReaction
          optimistically. The active emoji (matching myReaction) gets a primary
          ring so the user can see what they reacted with + tap again to swap
          (the backend replaces). */}
      {!user.isMe && (
        <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full border border-white/20 bg-black/40 px-2 py-1.5 backdrop-blur">
          {STORY_QUICK_REACTIONS.map((emoji) => {
            const active = myReaction === emoji
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                disabled={reacting}
                aria-label={`React with ${emoji}`}
                aria-pressed={active}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full text-xl transition hover:scale-125 disabled:opacity-50',
                  active && 'ring-2 ring-primary'
                )}
              >
                {emoji}
              </button>
            )
          })}
        </div>
      )}

      {/* Reply input bar (others) OR Replies button + popover (own story) */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        {user.isMe ? (
          <div className="relative">
            {/* Round 8: reactions button + popover (own story only, when
                there's at least one reaction). Sits above the Replies button
                so the user can see who reacted at a glance. Fetches the full
                reactions list (with avatars + emoji) from
                GET /api/stories/[id]/reactions. */}
            {headerReactionCount > 0 && (
              <div className="relative mb-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setReactionsOpen((v) => !v)}
                  aria-expanded={reactionsOpen}
                  aria-label="View story reactions"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/60"
                >
                  <Heart size={12} className="fill-current text-primary" />
                  {headerReactionCount} {headerReactionCount === 1 ? 'reaction' : 'reactions'}
                  {reactionsOpen ? <X size={12} /> : null}
                </button>
                <AnimatePresence>
                  {reactionsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="fc-scroll absolute bottom-full left-1/2 mb-2 max-h-72 w-64 max-w-[90vw] -translate-x-1/2 overflow-y-auto rounded-xl bg-black/80 p-2 backdrop-blur"
                    >
                      {loadingReactions && reactionList.length === 0 ? (
                        <div className="grid place-items-center py-8">
                          <Loader2 size={20} className="animate-spin text-white/70" />
                        </div>
                      ) : reactionList.length === 0 ? (
                        <div className="grid place-items-center gap-2 py-8 text-center text-sm text-white/60">
                          <Heart size={24} className="opacity-50" />
                          No reactions yet
                        </div>
                      ) : (
                        <ul className="space-y-0.5">
                          {reactionList.map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/5"
                            >
                              <UserAvatar name={r.userName} src={r.userPhoto} size={28} />
                              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
                                {r.userName}
                              </span>
                              <span className="text-lg">{r.emoji}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button
              type="button"
              onClick={() => setRepliesOpen((v) => !v)}
              aria-expanded={repliesOpen}
              aria-label="View story replies"
              className="flex w-full items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-white backdrop-blur transition hover:bg-black/60"
            >
              <MessageCircle size={16} />
              <span className="flex-1 text-left text-sm">
                {loadingReplies
                  ? 'Loading replies…'
                  : replies.length === 0
                  ? 'No replies yet'
                  : `Replies (${replies.length})`}
              </span>
              {repliesOpen ? <X size={16} /> : null}
            </button>
            <AnimatePresence>
              {repliesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="fc-scroll absolute bottom-full left-0 right-0 mb-2 max-h-72 overflow-y-auto rounded-xl bg-black/80 p-2 backdrop-blur"
                >
                  {loadingReplies && replies.length === 0 ? (
                    <div className="grid place-items-center py-8">
                      <Loader2 size={20} className="animate-spin text-white/70" />
                    </div>
                  ) : replies.length === 0 ? (
                    <div className="grid place-items-center gap-2 py-8 text-center text-sm text-white/60">
                      <MessageCircle size={24} className="opacity-50" />
                      No replies yet
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {replies.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-start gap-2 rounded-lg p-2 transition hover:bg-white/5"
                        >
                          <UserAvatar name={r.userName} src={r.userPhoto} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-xs font-semibold text-white">
                                {r.userName}
                              </span>
                              <span className="shrink-0 text-[10px] text-white/50">
                                {timeAgo(r.createdAt)}
                              </span>
                            </div>
                            <p className="break-words text-sm text-white/90">{r.content}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendReply()
            }}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-white backdrop-blur"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendReply()
                }
              }}
              placeholder={`Reply to ${user.name.split(' ')[0]}…`}
              maxLength={500}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/60"
              aria-label="Reply to story"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || sending}
              aria-label="Send reply"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              {sending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  )
}
