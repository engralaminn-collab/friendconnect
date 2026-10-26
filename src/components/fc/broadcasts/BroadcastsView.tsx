'use client'

/**
 * Broadcast lists view — a full-screen Dialog opened from the avatar dropdown
 * (TopBar). Lets the user create named broadcast lists of friends and send one
 * message to every recipient at once (each recipient receives a normal 1:1
 * message — there is no "broadcast chat").
 *
 * Backend contracts (round-9 backend, see worklog Task 19-backend):
 *   GET    /api/broadcasts                → { lists: [{ id, name, memberCount, members, createdAt }] }
 *   POST   /api/broadcasts                → { action: 'create', name, memberIds } | { action: 'send', listId, content }
 *   DELETE /api/broadcasts?id=LIST_ID     → { ok }
 *
 * The view itself is a single Dialog (`open` controlled by the parent). It
 * manages two nested dialogs internally:
 *   - CreateBroadcastDialog  — name + multi-select friends → POST create
 *   - ListDetailDialog       — members + message composer → POST send + DELETE
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UserAvatar, EmptyState } from '@/components/fc/ui'
import { api, timeAgo } from '@/lib/api'
import { toast } from 'sonner'
import { Megaphone, Users, Plus, Send, Trash2, Loader2 } from 'lucide-react'

// ---- API types ---------------------------------------------------------------

interface BroadcastMember {
  id: string
  name: string
  username: string
}
interface BroadcastList {
  id: string
  name: string
  memberCount: number
  members: BroadcastMember[]
  createdAt: string
}
interface FriendLite {
  id: string
  name: string
  username: string
  photoUrl: string | null
}

// ---- Main view ---------------------------------------------------------------

export function BroadcastsView({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [lists, setLists] = useState<BroadcastList[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailList, setDetailList] = useState<BroadcastList | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ lists: BroadcastList[] }>('/api/broadcasts')
      setLists(data.lists || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load broadcast lists')
      setLists([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  // When the outer dialog closes, dismiss any open nested dialogs too so the
  // next time the user opens Broadcasts they don't see a stale sub-dialog.
  useEffect(() => {
    if (!open) {
      setCreateOpen(false)
      setDetailOpen(false)
      setDetailList(null)
    }
  }, [open])

  const openDetail = (list: BroadcastList) => {
    setDetailList(list)
    setDetailOpen(true)
  }

  const handleCreated = () => {
    setCreateOpen(false)
    load()
  }

  const handleDeleted = () => {
    setDetailOpen(false)
    setDetailList(null)
    load()
  }

  const handleSent = () => {
    // Refresh the parent list (updatedAt ordering may change) but keep the
    // detail dialog open so the user can send another broadcast if they like.
    load()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {/* Header */}
          <DialogHeader className="shrink-0 gap-0 border-b border-border bg-background/95 px-5 pb-4 pt-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <Megaphone size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle>Broadcasts</DialogTitle>
                <DialogDescription className="truncate">
                  Send one message to multiple friends at once.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
            <span className="text-xs text-muted-foreground">
              {lists.length === 0
                ? 'No lists yet'
                : `${lists.length} list${lists.length === 1 ? '' : 's'}`}
            </span>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-1" /> New list
            </Button>
          </div>

          {/* Body */}
          <div className="fc-scroll flex-1 overflow-y-auto px-3 py-3">
            {loading && lists.length === 0 ? (
              <div className="space-y-2 px-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[68px] animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : lists.length === 0 ? (
              <EmptyState
                icon={<Megaphone size={36} />}
                title="No broadcast lists"
                description="Create a list to send one message to multiple friends at once. Each recipient gets a private 1:1 message."
                action={
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus size={14} className="mr-1" /> Create your first list
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2 px-1">
                {lists.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => openDetail(l)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-accent/40 active:scale-[0.99]"
                      aria-label={`Open broadcast list ${l.name}`}
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                        <Megaphone size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{l.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users size={11} />
                            {l.memberCount} member{l.memberCount === 1 ? '' : 's'}
                          </span>
                          <span aria-hidden>·</span>
                          <span>Created {timeAgo(l.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateBroadcastDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <ListDetailDialog
        list={detailList}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o)
          if (!o) setDetailList(null)
        }}
        onDeleted={handleDeleted}
        onSent={handleSent}
      />
    </>
  )
}

// ---- Create dialog -----------------------------------------------------------

function CreateBroadcastDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [friends, setFriends] = useState<FriendLite[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [creating, setCreating] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setSelected(new Set())
  }, [])

  useEffect(() => {
    if (!open) return
    setLoadingFriends(true)
    api<{ friends: FriendLite[] }>('/api/friends')
      .then((data) => setFriends(data.friends || []))
      .catch(() => setFriends([]))
      .finally(() => setLoadingFriends(false))
  }, [open])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(friends.map((f) => f.id)))
  const clearAll = () => setSelected(new Set())

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Please enter a list name')
      return
    }
    if (selected.size === 0) {
      toast.error('Select at least one recipient')
      return
    }
    setCreating(true)
    try {
      await api('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          name: trimmed,
          memberIds: Array.from(selected),
        }),
      })
      toast.success('Broadcast list created')
      reset()
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create list')
    } finally {
      setCreating(false)
    }
  }

  const close = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  const allSelected = friends.length > 0 && selected.size === friends.length

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 gap-2 border-b border-border px-5 pb-4 pt-5">
          <DialogTitle>New broadcast list</DialogTitle>
          <DialogDescription>
            Pick a name and the friends who should receive your broadcasts.
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="fc-scroll flex-1 overflow-y-auto px-5 py-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="b-name">
              List name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="b-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend trip"
              maxLength={60}
              className="rounded-xl"
              autoFocus
            />
          </div>

          {/* Recipients */}
          <div className="mt-4 flex items-center justify-between">
            <Label className="text-sm">
              Recipients{' '}
              <span className="text-muted-foreground">
                ({selected.size} selected)
              </span>
            </Label>
            {friends.length > 0 && (
              <button
                type="button"
                onClick={allSelected ? clearAll : selectAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>

          {/* Friend list (scrollable, max-h-60) */}
          <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border">
            {loadingFriends ? (
              <div className="grid place-items-center py-10">
                <Loader2 size={22} className="animate-spin text-muted-foreground" />
              </div>
            ) : friends.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                You need friends before you can create a broadcast list.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {friends.map((f) => {
                  const checked = selected.has(f.id)
                  return (
                    <li key={f.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-accent/40">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(f.id)}
                          aria-label={`Select ${f.name}`}
                        />
                        <UserAvatar name={f.name} src={f.photoUrl} size={34} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{f.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            @{f.username}
                          </div>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={() => close(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim() || selected.size === 0}
          >
            {creating ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus size={14} className="mr-1" /> Create list
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- List detail dialog ------------------------------------------------------

function ListDetailDialog({
  list,
  open,
  onOpenChange,
  onDeleted,
  onSent,
}: {
  list: BroadcastList | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onDeleted: () => void
  onSent: () => void
}) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reset composer state whenever the target list changes.
  useEffect(() => {
    setContent('')
    setConfirmDelete(false)
  }, [list?.id])

  const handleSend = async () => {
    if (!list) return
    const trimmed = content.trim()
    if (!trimmed) {
      toast.error('Please enter a message')
      return
    }
    setSending(true)
    try {
      const data = await api<{ ok: boolean; sent: number }>('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send',
          listId: list.id,
          content: trimmed,
        }),
      })
      toast.success(`Message sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}`)
      setContent('')
      onSent()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!list) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await api(`/api/broadcasts?id=${encodeURIComponent(list.id)}`, {
        method: 'DELETE',
      })
      toast.success('List deleted')
      onOpenChange(false)
      onDeleted()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete list')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setConfirmDelete(false)
        onOpenChange(o)
      }}
    >
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {list && (
          <>
            <DialogHeader className="shrink-0 gap-2 border-b border-border px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Megaphone size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate">{list.name}</DialogTitle>
                  <DialogDescription className="truncate">
                    {list.memberCount} member{list.memberCount === 1 ? '' : 's'} ·{' '}
                    created {timeAgo(list.createdAt)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Members list */}
            <div className="fc-scroll flex-1 overflow-y-auto px-5 py-4">
              <Label className="text-sm">Members</Label>
              {list.members.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  This list has no members.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {list.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                      <UserAvatar name={m.name} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{m.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          @{m.username}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Composer */}
              <div className="mt-5 space-y-1.5">
                <Label htmlFor="b-content">Broadcast message</Label>
                <Textarea
                  id="b-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type a message to broadcast…"
                  maxLength={2000}
                  className="min-h-[88px] resize-none rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Each recipient gets a private 1:1 message from you. Press
                  ⌘/Ctrl + Enter to send.
                </p>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="shrink-0 items-center border-t border-border px-5 py-3 sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting || sending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <Trash2 size={14} className="mr-1" />
                )}
                {confirmDelete ? 'Confirm delete' : 'Delete list'}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !content.trim()}
                >
                  {sending ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Send size={14} className="mr-1" />
                  )}
                  Broadcast
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
