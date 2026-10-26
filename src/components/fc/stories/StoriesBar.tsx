'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, uploadFile } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { UserAvatar, SectionTitle } from '@/components/fc/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Camera, Type, Loader2, ImageIcon, Bookmark, Star, BellOff, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { StoryViewer, type StoryItem, type StoryViewerUser } from './StoryViewer'

interface StoryUser {
  userId: string
  name: string
  username: string
  photoUrl: string | null
  isMe: boolean
  storiesMuted?: boolean
  stories: StoryItem[]
  highlights: StoryItem[]
}

// Curated background swatches for text stories (no indigo/blue)
const BG_SWATCHES: { value: string; label: string }[] = [
  { value: 'linear-gradient(135deg, #10b981, #14b8a6)', label: 'Emerald' },
  { value: 'linear-gradient(135deg, #047857, #065f46)', label: 'Forest' },
  { value: 'linear-gradient(135deg, #f97316, #ec4899)', label: 'Sunset' },
  { value: 'linear-gradient(135deg, #f43f5e, #be123c)', label: 'Rose' },
  { value: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Amber' },
  { value: 'linear-gradient(135deg, #a855f7, #7e22ce)', label: 'Plum' },
  { value: 'linear-gradient(135deg, #1f1f23, #000000)', label: 'Charcoal' },
  { value: '#0a0a0a', label: 'Black' },
]

const DEFAULT_BG = BG_SWATCHES[0].value

export function StoriesBar() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<StoryUser[]>([])
  const [loading, setLoading] = useState(true)
  // Viewer state — `list` selects whether the viewer shows the user's active
  // stories or their highlights. `startIndex` lets us open on a specific
  // highlight when one is tapped.
  const [viewer, setViewer] = useState<{
    user: StoryUser
    list: 'stories' | 'highlights'
    startIndex?: number
  } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  // Close-friends filter (off by default — shows all friends' stories)
  const [closeOnly, setCloseOnly] = useState(false)
  const [closeFriendIds, setCloseFriendIds] = useState<Set<string>>(new Set())
  // Per-ring long-press menu (mute stories toggle)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [muteLoading, setMuteLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api<{ stories: StoryUser[] }>('/api/stories')
      // Sort: me first, then others by createdAt of newest story (already desc from API)
      const me = data.stories.filter((g) => g.isMe)
      const others = data.stories.filter((g) => !g.isMe)
      setGroups([...me, ...others])
    } catch {
      // silent — empty bar shown
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCloseFriends = useCallback(async () => {
    try {
      const data = await api<{ closeFriends: { id: string }[] }>('/api/friends/close')
      setCloseFriendIds(new Set(data.closeFriends.map((cf) => cf.id)))
    } catch {
      // ignore — close-friends filter just stays empty
    }
  }, [])

  useEffect(() => {
    load()
    loadCloseFriends()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load, loadCloseFriends])

  const toggleMute = useCallback(async (userId: string, currentMuted: boolean) => {
    setMuteLoading(userId)
    setMenuFor(null)
    try {
      await api('/api/friends/close', {
        method: 'POST',
        body: JSON.stringify({ targetId: userId, action: 'muteStories', value: !currentMuted }),
      })
      toast.success(!currentMuted ? 'Stories muted' : 'Stories unmuted')
      // Backend filters out active stories from muted users on next fetch.
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update')
    } finally {
      setMuteLoading(null)
    }
  }, [load])

  // Build the "me" entry (real or synthetic so user can always add a story)
  const myGroup: StoryUser | null = (() => {
    const existing = groups.find((g) => g.isMe)
    if (existing) return existing
    if (!user) return null
    return {
      userId: user.id,
      name: user.name,
      username: user.username,
      photoUrl: user.profile?.photoUrl ?? null,
      isMe: true,
      stories: [],
      highlights: [],
    }
  })()

  // Main stories row — only show users that have at least one active story, or
  // the current user (so they can always add a story). Friends with only
  // highlights appear exclusively in the highlights section below.
  // When the "Close friends" filter is on, restrict to me + close friends only.
  const ordered = (myGroup ? [myGroup, ...groups.filter((g) => !g.isMe)] : groups).filter(
    (g) => g.isMe || g.stories.length > 0
  ).filter((g) => g.isMe || !closeOnly || closeFriendIds.has(g.userId))
  const hasAny = groups.length > 0

  // Flatten all highlights across users (me first, then friends) for the
  // highlights row. Each entry carries a reference to its owning user so we
  // can open the viewer on that user's highlights array.
  const highlightEntries = (myGroup ? [myGroup, ...groups.filter((g) => !g.isMe)] : groups)
    .filter((g) => g.highlights.length > 0)
    .flatMap((g) => g.highlights.map((h) => ({ user: g, story: h })))

  const openViewerFor = (g: StoryUser) => {
    if (g.stories.length === 0) {
      setCreateOpen(true)
      return
    }
    setViewer({ user: g, list: 'stories' })
  }

  const openHighlightAt = (g: StoryUser, storyId: string) => {
    const startIndex = Math.max(0, g.highlights.findIndex((h) => h.id === storyId))
    setViewer({ user: g, list: 'highlights', startIndex })
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="fc-no-scroll flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex w-[68px] flex-col items-center gap-1.5">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-2 w-10 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  // Empty state — no stories at all
  if (!hasAny) {
    return (
      <>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/15 active:scale-95"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
            <Plus size={13} />
          </span>
          Add your story
        </button>
        <CreateStoryDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={load}
        />
      </>
    )
  }

  return (
    <>
      {/* Close-friends filter pill + stories row */}
      <div className="flex items-center gap-2 pb-1">
        <button
          type="button"
          onClick={() => setCloseOnly((v) => !v)}
          aria-pressed={closeOnly}
          title="Show only close friends' stories"
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition',
            closeOnly
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          <Star size={11} className={closeOnly ? 'fill-primary text-primary' : ''} />
          Close friends
        </button>
        <div className="fc-no-scroll -mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
          {ordered.length === 0 ? (
            <span className="py-3 text-xs text-muted-foreground">
              No close friends with active stories.
            </span>
          ) : (
            ordered.map((g) => {
              const isMe = g.isMe
              const hasStories = g.stories.length > 0
              const unviewed = !isMe && g.stories.some((s) => !s.viewedByMe)
              const muted = !!g.storiesMuted
              const firstName = (g.name || g.username || 'User').split(' ')[0]
              const label = isMe ? (hasStories ? 'Your story' : 'Add story') : firstName

              return (
                <div
                  key={g.userId}
                  className="flex w-[72px] flex-shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => openViewerFor(g)}
                      onContextMenu={(e) => {
                        if (isMe) return
                        e.preventDefault()
                        setMenuFor(g.userId)
                      }}
                      onPointerDown={(e) => {
                        if (isMe) return
                        // Long-press to open mute menu on touch devices.
                        const target = e.currentTarget
                        const timer = window.setTimeout(() => {
                          setMenuFor(g.userId)
                          // Prevent the click that fires after pointerup.
                          target.dataset.longPressed = '1'
                          setTimeout(() => { delete target.dataset.longPressed }, 400)
                        }, 500)
                        const clear = () => {
                          window.clearTimeout(timer)
                          target.removeEventListener('pointerup', clear)
                          target.removeEventListener('pointerleave', clear)
                          target.removeEventListener('pointercancel', clear)
                        }
                        target.addEventListener('pointerup', clear, { once: true })
                        target.addEventListener('pointerleave', clear, { once: true })
                        target.addEventListener('pointercancel', clear, { once: true })
                      }}
                      onClickCapture={(e) => {
                        const t = e.currentTarget as HTMLButtonElement
                        if (t.dataset.longPressed === '1') {
                          e.preventDefault()
                          e.stopPropagation()
                        }
                      }}
                      className="relative block rounded-full transition active:scale-95"
                      aria-label={isMe ? 'Your story' : `${g.name}'s story — long-press for options`}
                    >
                      {/* Gradient ring */}
                      <span
                        className={cn(
                          'block rounded-full p-[2.5px] transition-colors',
                          isMe
                            ? 'bg-muted'
                            : muted
                            ? 'bg-muted'
                            : unviewed
                            ? 'bg-gradient-to-tr from-primary via-primary to-accent'
                            : 'bg-muted'
                        )}
                      >
                        {/* Inner border (background-colored gap) */}
                        <span className="block rounded-full bg-background p-[2px]">
                          <UserAvatar name={g.name} src={g.photoUrl} size={60} />
                        </span>
                      </span>
                    </button>

                    {/* "+" add overlay for current user */}
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        aria-label="Add a new story"
                        className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-[3px] border-background bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-90"
                      >
                        <Plus size={13} strokeWidth={2.75} />
                      </button>
                    )}

                    {/* Close-friend badge */}
                    {!isMe && closeFriendIds.has(g.userId) && (
                      <span
                        title="Close friend"
                        aria-label="Close friend"
                        className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground"
                      >
                        <Star size={8} className="fill-current" />
                      </span>
                    )}

                    {/* Muted indicator */}
                    {!isMe && muted && (
                      <span
                        title="Stories muted"
                        aria-label="Stories muted"
                        className="absolute -bottom-0.5 -left-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-background bg-popover text-muted-foreground"
                      >
                        <BellOff size={10} />
                      </span>
                    )}

                    {/* Long-press menu for mute/unmute */}
                    {!isMe && menuFor === g.userId && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                        <div className="fc-rise absolute left-1/2 top-full z-30 mt-2 w-40 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
                          <button
                            type="button"
                            disabled={muteLoading === g.userId}
                            onClick={() => toggleMute(g.userId, muted)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                          >
                            {muteLoading === g.userId ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : muted ? (
                              <Bell size={14} />
                            ) : (
                              <BellOff size={14} />
                            )}
                            {muted ? 'Unmute stories' : 'Mute stories'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <span
                    className={cn(
                      'max-w-[68px] truncate text-center text-[10px] font-medium',
                      unviewed ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    title={label}
                  >
                    {label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Highlights section — saved stories from me + friends that don't expire */}
      {highlightEntries.length > 0 && (
        <section className="mt-3">
          <SectionTitle>HIGHLIGHTS</SectionTitle>
          <div className="fc-no-scroll mt-2 flex gap-3 overflow-x-auto pb-1">
            {highlightEntries.map(({ user: g, story }) => (
              <button
                key={story.id}
                type="button"
                onClick={() => openHighlightAt(g, story.id)}
                className="flex w-[48px] flex-shrink-0 flex-col items-center gap-1"
                aria-label={`Highlight from ${g.isMe ? 'you' : g.name}`}
                title={g.isMe ? 'Your highlight' : `${g.name}'s highlight`}
              >
                <div className="relative">
                  <HighlightThumbnail story={story} />
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                    <Bookmark size={9} className="fill-current" />
                  </span>
                </div>
                <span
                  className="max-w-[44px] truncate text-center text-[9px] text-muted-foreground"
                  title={g.isMe ? 'You' : g.name}
                >
                  {g.isMe ? 'You' : (g.name || g.username || 'User').split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Story viewer (full-screen modal) */}
      <AnimatePresence>
        {viewer &&
          (viewer.list === 'stories' ? viewer.user.stories : viewer.user.highlights).length > 0 && (
            <StoryViewer
              stories={viewer.list === 'stories' ? viewer.user.stories : viewer.user.highlights}
              user={viewer.user as StoryViewerUser}
              startIndex={viewer.startIndex}
              onClose={() => setViewer(null)}
              onHighlightChange={() => load()}
            />
          )}
      </AnimatePresence>

      <CreateStoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />
    </>
  )
}

/* ---------------- Highlight thumbnail ---------------- */

function HighlightThumbnail({ story }: { story: StoryItem }) {
  // Image highlights show the image as a 40px circular preview.
  if (story.type === 'image') {
    return (
      <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-border">
        <img
          src={story.content}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }
  // Text highlights show the gradient background with a tiny snippet of the text.
  return (
    <div
      className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-border"
      style={{
        background: story.bg || 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
      }}
    >
      <span className="line-clamp-2 px-1 text-center text-[7px] font-semibold leading-tight text-white">
        {story.content}
      </span>
    </div>
  )
}

/* ---------------- Create Story Dialog ---------------- */

interface CreateStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function CreateStoryDialog({ open, onOpenChange, onCreated }: CreateStoryDialogProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('')
  const [bg, setBg] = useState<string>(DEFAULT_BG)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setMode('text')
        setText('')
        setBg(DEFAULT_BG)
        setFile(null)
        if (filePreview) URL.revokeObjectURL(filePreview)
        setFilePreview(null)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open, filePreview])

  const onPickFile = (f: File | null) => {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (filePreview) URL.revokeObjectURL(filePreview)
    setFile(f)
    setFilePreview(URL.createObjectURL(f))
  }

  const handleTextSubmit = async () => {
    const content = text.trim()
    if (!content) {
      toast.error('Write something to share')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/stories', {
        method: 'POST',
        body: JSON.stringify({ type: 'text', content, bg }),
      })
      toast.success('Story shared')
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to post story')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageSubmit = async () => {
    if (!file) {
      toast.error('Choose an image first')
      return
    }
    setSubmitting(true)
    try {
      const { file: uploaded } = await uploadFile(file)
      await api('/api/stories', {
        method: 'POST',
        body: JSON.stringify({ type: 'image', content: uploaded.url, bg: null }),
      })
      toast.success('Story shared')
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to post story')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (mode === 'text') handleTextSubmit()
    else handleImageSubmit()
  }

  const canSubmit = mode === 'text' ? text.trim().length > 0 : !!file

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">New story</DialogTitle>
          <DialogDescription className="text-xs">
            Share a moment — stories disappear after 24 hours.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 px-5 pb-3">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition',
              mode === 'text'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <Type size={14} />
            Text
          </button>
          <button
            type="button"
            onClick={() => setMode('image')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition',
              mode === 'image'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            <Camera size={14} />
            Image
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-3">
          {mode === 'text' ? (
            <div className="space-y-3">
              {/* Live preview */}
              <div
                className="flex h-36 w-full items-center justify-center rounded-xl p-4"
                style={{ background: bg }}
              >
                <p className="line-clamp-3 break-words text-center text-base font-semibold leading-snug text-white">
                  {text.trim() || 'Your story preview'}
                </p>
              </div>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type something..."
                maxLength={280}
                className="min-h-[72px] resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Background</Label>
                <span className="text-[10px] text-muted-foreground">{text.length}/280</span>
              </div>

              {/* Swatches */}
              <div className="flex flex-wrap gap-2">
                {BG_SWATCHES.map((sw) => (
                  <button
                    key={sw.value}
                    type="button"
                    aria-label={sw.label}
                    onClick={() => setBg(sw.value)}
                    className={cn(
                      'h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition active:scale-90',
                      bg === sw.value
                        ? 'ring-2 ring-primary ring-offset-2'
                        : 'ring-1 ring-border hover:ring-primary/40'
                    )}
                    style={{ background: sw.value }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              {filePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={filePreview}
                    alt="Selected"
                    className="h-56 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (filePreview) URL.revokeObjectURL(filePreview)
                      setFilePreview(null)
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <ImageIcon size={22} />
                  </div>
                  <span className="text-sm font-medium">Choose an image</span>
                  <span className="text-[11px] text-muted-foreground">PNG, JPG, GIF, WebP</span>
                </button>
              )}
              {file && (
                <p className="truncate text-[11px] text-muted-foreground" title={file.name}>
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Share story
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
