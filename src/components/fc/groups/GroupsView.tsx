'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/hooks/use-auth'
import { api, uploadFile, timeAgo } from '@/lib/api'
import { UserAvatar, EmptyState } from '@/components/fc/ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Plus,
  Users,
  UserPlus,
  LogOut,
  Crown,
  Shield,
  Settings2,
  Camera,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ---------- Types ----------
type Role = 'OWNER' | 'ADMIN' | 'MEMBER'

interface GroupSummary {
  id: string
  name: string
  description: string | null
  photoUrl: string | null
  role: Role
  memberCount: number
  createdAt: string
}

interface GroupMember {
  id: string
  username: string
  name: string
  photoUrl: string | null
  role: Role
}

interface GroupDetail {
  id: string
  name: string
  description: string | null
  photoUrl: string | null
  createdAt: string
  isMember: boolean
  members: GroupMember[]
}

interface FriendLite {
  id: string
  name: string
  username?: string
  photoUrl: string | null
}

// ---------- GroupAvatar ----------
function GroupAvatar({
  name,
  src,
  size = 48,
}: {
  name: string
  src?: string | null
  size?: number
}) {
  const initial = (name?.trim()?.[0] || '').toUpperCase()
  return (
    <Avatar
      className="rounded-2xl ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      {src ? <AvatarImage src={src} alt={name} className="object-cover" /> : null}
      <AvatarFallback
        className="rounded-2xl bg-primary/15 text-primary font-bold"
        style={{ fontSize: size * 0.42 }}
      >
        {initial || <Users size={size * 0.5} />}
      </AvatarFallback>
    </Avatar>
  )
}

// ---------- RoleBadge ----------
function RoleBadge({ role }: { role: Role }) {
  if (role === 'OWNER') {
    return (
      <Badge className="gap-1 rounded-full border-transparent bg-primary text-primary-foreground">
        <Crown size={11} /> Owner
      </Badge>
    )
  }
  if (role === 'ADMIN') {
    return (
      <Badge className="gap-1 rounded-full border-transparent bg-secondary text-secondary-foreground">
        <Shield size={11} /> Admin
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 rounded-full border-transparent bg-muted text-muted-foreground">
      <Users size={11} /> Member
    </Badge>
  )
}

// ---------- useLongPress ----------
function useLongPress(cb: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggered = useRef(false)

  const start = useCallback(() => {
    triggered.current = false
    timer.current = setTimeout(() => {
      triggered.current = true
      cb()
    }, ms)
  }, [cb, ms])

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const handlers = {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
  }

  const wasLongPress = () => triggered.current

  return [handlers, wasLongPress] as const
}

// ---------- Skeletons ----------
function GroupCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex gap-3">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

// ---------- Main view ----------
export function GroupsView() {
  const { openGroupChat } = useApp()

  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<{ groups: GroupSummary[] }>('/api/groups')
      setGroups(data.groups || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">Groups</h1>
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`}
            </p>
          </div>
          <Button size="sm" className="rounded-full" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create
          </Button>
        </div>
      </header>

      {/* List */}
      <div className="fc-scroll flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<MessageCircle size={36} />}
            title="Could not load groups"
            description={error}
            action={
              <Button size="sm" variant="secondary" onClick={loadGroups}>
                Retry
              </Button>
            }
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Users size={40} />}
            title="No groups yet"
            description="Create your first group to chat with several friends at once."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={14} className="mr-1" /> Create group
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                onOpenChat={() => openGroupChat(g.id)}
                onOpenDetails={() => setDetailId(g.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          loadGroups()
          if (id) openGroupChat(id)
        }}
      />

      {/* Details dialog */}
      <GroupDetailsDialog
        groupId={detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        onChanged={loadGroups}
      />
    </div>
  )
}

// ---------- GroupCard ----------
function GroupCard({
  group,
  onOpenChat,
  onOpenDetails,
}: {
  group: GroupSummary
  onOpenChat: () => void
  onOpenDetails: () => void
}) {
  const [longPressHandlers, wasLongPress] = useLongPress(() => {
    onOpenDetails()
  }, 500)

  const handleClick = () => {
    if (wasLongPress()) return
    onOpenChat()
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenChat()
        }
      }}
      {...longPressHandlers}
      className="flex flex-row cursor-pointer items-center gap-3 rounded-2xl border-border bg-card p-3 py-3 shadow-none transition hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <GroupAvatar name={group.name} src={group.photoUrl} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold leading-tight">{group.name}</h3>
          <RoleBadge role={group.role} />
        </div>
        {group.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {group.description}
          </p>
        ) : (
          <p className="mt-1 text-xs italic text-muted-foreground/70">No description</p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users size={11} /> {group.memberCount}
          </span>
          <span aria-hidden>·</span>
          <span>{timeAgo(group.createdAt)} ago</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpenDetails()
        }}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label={`View details for ${group.name}`}
      >
        <Settings2 size={18} />
      </button>
    </Card>
  )
}

// ---------- CreateGroupDialog ----------
function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (id?: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [friends, setFriends] = useState<FriendLite[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loadingFriends, setLoadingFriends] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setDescription('')
    setPhotoUrl(null)
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

  const handleFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const data = await uploadFile(file)
      setPhotoUrl(data.file.url)
      toast.success('Photo uploaded')
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Group name is required')
      return
    }
    setCreating(true)
    try {
      const data = await api<{ group: { id: string; name: string } }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          photoUrl: photoUrl || undefined,
          memberIds: Array.from(selected),
        }),
      })
      toast.success('Group created')
      const id = data.group?.id
      reset()
      onOpenChange(false)
      onCreated(id)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const close = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-5 pb-3 pt-5">
          <DialogTitle>Create a group</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Name your group and pick members to add.
          </p>
        </DialogHeader>

        <div className="fc-scroll flex-1 overflow-y-auto px-5 py-4">
          {/* Photo */}
          <div className="flex items-center gap-3">
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {photoUrl ? (
                <div className="h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-border">
                  <img
                    src={photoUrl}
                    alt="Group photo preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-border">
                  <Camera size={22} />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 grid place-items-center rounded-2xl bg-background/70">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              )}
            </label>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Group photo</p>
              <p>Tap to upload (optional)</p>
            </div>
          </div>

          {/* Name */}
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="g-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="g-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend trip"
              maxLength={60}
              className="rounded-xl"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="g-desc">Description</Label>
            <Textarea
              id="g-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              maxLength={240}
              className="min-h-[80px] resize-none rounded-xl"
            />
            <p className="text-right text-[10px] text-muted-foreground">
              {description.length}/240
            </p>
          </div>

          {/* Members */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <Label>Add members ({selected.size})</Label>
              {friends.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    if (selected.size === friends.length) setSelected(new Set())
                    else setSelected(new Set(friends.map((f) => f.id)))
                  }}
                >
                  {selected.size === friends.length ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            <Separator className="my-2" />
            {loadingFriends ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Loading friends…
              </div>
            ) : friends.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                You have no friends to add yet.
              </p>
            ) : (
              <div className="fc-scroll max-h-56 space-y-0.5 overflow-y-auto">
                {friends.map((f) => {
                  const checked = selected.has(f.id)
                  return (
                    <label
                      key={f.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl p-2 transition hover:bg-accent/40',
                        checked && 'bg-accent/40'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(f.id)}
                      />
                      <UserAvatar name={f.name} src={f.photoUrl} size={36} />
                      <span className="truncate text-sm font-medium">{f.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            onClick={() => close(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? (
              <Loader2 size={14} className="mr-1 animate-spin" />
            ) : (
              <Plus size={14} className="mr-1" />
            )}
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- GroupDetailsDialog ----------
function GroupDetailsDialog({
  groupId,
  onOpenChange,
  onChanged,
}: {
  groupId: string | null
  onOpenChange: (o: boolean) => void
  onChanged: () => void
}) {
  const { user } = useAuth()
  const { openGroupChat } = useApp()

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  // Add members sub-flow
  const [adding, setAdding] = useState(false)
  const [friends, setFriends] = useState<FriendLite[]>([])
  const [selectedAdd, setSelectedAdd] = useState<Set<string>>(new Set())
  const [addLoading, setAddLoading] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<{ group: GroupDetail }>(`/api/groups/${id}`)
      setGroup(data.group)
    } catch (e: any) {
      setError(e?.message || 'Failed to load group')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (groupId) {
      setGroup(null)
      setAdding(false)
      setSelectedAdd(new Set())
      load(groupId)
    } else {
      setGroup(null)
      setError(null)
      setAdding(false)
      setSelectedAdd(new Set())
    }
  }, [groupId, load])

  const myRole = group?.members.find((m) => m.id === user?.id)?.role
  const isOwner = myRole === 'OWNER'

  const handleLeave = async () => {
    if (!group) return
    setLeaving(true)
    try {
      await api(`/api/groups/${group.id}/members?userId=me`, { method: 'DELETE' })
      toast.success('You left the group')
      onOpenChange(false)
      onChanged()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to leave group')
    } finally {
      setLeaving(false)
    }
  }

  const openAddFlow = async () => {
    if (!group) return
    setAdding(true)
    setSelectedAdd(new Set())
    try {
      const data = await api<{ friends: FriendLite[] }>('/api/friends')
      const existing = new Set(group.members.map((m) => m.id))
      setFriends(data.friends.filter((f) => !existing.has(f.id)))
    } catch {
      setFriends([])
    }
  }

  const handleAddMembers = async () => {
    if (!group) return
    if (selectedAdd.size === 0) {
      setAdding(false)
      return
    }
    setAddLoading(true)
    try {
      const ids = Array.from(selectedAdd)
      await Promise.all(
        ids.map((uid) =>
          api(`/api/groups/${group.id}/members`, {
            method: 'POST',
            body: JSON.stringify({ userId: uid }),
          })
        )
      )
      toast.success(`Added ${ids.length} member${ids.length === 1 ? '' : 's'}`)
      setAdding(false)
      setSelectedAdd(new Set())
      await load(group.id)
      onChanged()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add members')
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <Dialog open={!!groupId} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border px-5 pb-3 pt-5">
          <DialogTitle className="flex items-center gap-3">
            <GroupAvatar name={group?.name || 'Group'} src={group?.photoUrl} size={40} />
            <div className="min-w-0">
              <div className="truncate">{group?.name || 'Group'}</div>
              <p className="text-xs font-normal text-muted-foreground">
                {group
                  ? `${group.members.length} ${group.members.length === 1 ? 'member' : 'members'} · created ${timeAgo(group.createdAt)} ago`
                  : 'Loading…'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="flex-1 px-5 py-10 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              onClick={() => groupId && load(groupId)}
            >
              Retry
            </Button>
          </div>
        ) : group ? (
          <div className="fc-scroll flex-1 overflow-y-auto px-5 py-3">
            {group.description && (
              <p className="mb-3 text-sm text-muted-foreground">{group.description}</p>
            )}

            {adding ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Add members</h3>
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:underline"
                    onClick={() => {
                      setAdding(false)
                      setSelectedAdd(new Set())
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {friends.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    All your friends are already in this group.
                  </p>
                ) : (
                  <div className="fc-scroll max-h-72 space-y-0.5 overflow-y-auto">
                    {friends.map((f) => {
                      const checked = selectedAdd.has(f.id)
                      return (
                        <label
                          key={f.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-xl p-2 transition hover:bg-accent/40',
                            checked && 'bg-accent/40'
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              setSelectedAdd((prev) => {
                                const next = new Set(prev)
                                if (next.has(f.id)) next.delete(f.id)
                                else next.add(f.id)
                                return next
                              })
                            }}
                          />
                          <UserAvatar name={f.name} src={f.photoUrl} size={36} />
                          <span className="truncate text-sm font-medium">{f.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Members ({group.members.length})
                  </h3>
                </div>
                <div className="fc-scroll max-h-72 space-y-0.5 overflow-y-auto">
                  {group.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/40"
                    >
                      <UserAvatar name={m.name} src={m.photoUrl} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {m.name}
                          {m.id === user?.id && (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          @{m.username}
                        </div>
                      </div>
                      <RoleBadge role={m.role} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* Footer */}
        {group && !error && (
          <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
            {!adding && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => openGroupChat(group.id)}
              >
                <MessageCircle size={14} className="mr-1" /> Open chat
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {adding ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAdding(false)
                      setSelectedAdd(new Set())
                    }}
                    disabled={addLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMembers}
                    disabled={addLoading || selectedAdd.size === 0}
                  >
                    {addLoading ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <UserPlus size={14} className="mr-1" />
                    )}
                    Add{selectedAdd.size > 0 ? ` (${selectedAdd.size})` : ''}
                  </Button>
                </>
              ) : (
                <>
                  {isOwner && (
                    <Button variant="secondary" onClick={openAddFlow}>
                      <UserPlus size={14} className="mr-1" /> Add members
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={handleLeave}
                    disabled={leaving}
                  >
                    {leaving ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <LogOut size={14} className="mr-1" />
                    )}
                    Leave
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
