'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth, AuthUser } from '@/hooks/use-auth'
import { useApp } from '@/lib/store'
import { useSocket } from '@/hooks/use-socket'
import { api, lastSeenText, formatLastSeenPrecise, uploadFile } from '@/lib/api'
import { UserAvatar, EmptyState } from '@/components/fc/ui'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Camera, MapPin, Phone, Cake, GraduationCap, Briefcase, Pencil, MessageCircle, PhoneCall, Video, UserPlus, Check, Ban, ShieldOff, ArrowLeft, Lock, Sparkles, Loader2, Crop, X, BadgeCheck, ShieldCheck, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProfileResult {
  user: { id: string; username: string; name: string; photoUrl: string | null; photoFilter: string | null; verified: string; bio: string | null; phone: string | null; location: string | null; birthday: string | null; education: string | null; work: string | null; lastSeen?: string | null }
  relation: { isFriend: boolean; isBlocked: boolean; blockedByMe: boolean; status: string; incomingRequest: boolean; outgoingRequest: boolean }
  canMessage: boolean
  canCall: boolean
}

export function ProfileView() {
  const { user, refresh } = useAuth()
  const { activeProfileId, setView, openChat } = useApp()
  const { isOnline } = useSocket()
  const [profile, setProfile] = useState<ProfileResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const isMe = !activeProfileId || activeProfileId === user?.id
  const targetId = isMe ? user!.id : activeProfileId!

  useEffect(() => {
    if (isMe) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api<ProfileResult>(`/api/users/${targetId}`)
      .then(setProfile)
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false))
  }, [targetId, isMe])

  if (isMe) {
    return <MyProfile />
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="fc-pulse text-muted-foreground">Loading…</div></div>
  }
  if (!profile) {
    return <EmptyState title="Profile not found" description="This user may not exist anymore." action={<Button onClick={() => setView('friends')}>Back to friends</Button>} />
  }

  const u = profile.user
  const online = isOnline(u.id)

  const act = async (action: string, msg: string) => {
    setActionLoading(true)
    try {
      await api('/api/friends', { method: 'POST', body: JSON.stringify({ action, targetId: u.id }) })
      toast.success(msg)
      const p = await api<ProfileResult>(`/api/users/${u.id}`)
      setProfile(p)
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fc-scroll h-full overflow-y-auto pb-6">
      <div className="flex items-center gap-2 px-2 py-2">
        <button onClick={() => setView('friends')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"><ArrowLeft size={18} /></button>
        <span className="text-sm font-medium">Profile</span>
      </div>

      {/* Header */}
      <div className="relative px-4 pb-4">
        <div className="h-24 rounded-b-3xl bg-gradient-to-br from-primary/40 via-primary/20 to-accent" />
        <div className="-mt-12 flex items-end gap-4">
          <UserAvatar name={u.name} src={u.photoUrl} size={96} online={online} filter={u.photoFilter} verified={u.verified} className="border-4 border-background" />
          <div className="pb-1">
            <h1 className="flex items-center gap-1.5 text-xl font-bold">
              <span>{u.name}</span>
              {u.verified === 'verified' && (
                <BadgeCheck size={18} className="text-primary" aria-label="Verified" />
              )}
            </h1>
            <p className="text-sm text-muted-foreground">@{u.username}</p>
            <p
              className={online ? 'text-xs font-medium text-primary' : 'text-xs text-muted-foreground'}
              title={!online ? formatLastSeenPrecise(u.lastSeen).detail : undefined}
            >
              {lastSeenText(online, u.lastSeen)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4">
        {profile.relation.isFriend ? (
          <>
            <Button className="flex-1 rounded-xl" onClick={() => openChat(u.id)}><MessageCircle size={16} className="mr-1" />Message</Button>
            <Button variant="secondary" className="rounded-xl" onClick={() => startCall(u.id, 'audio')}><PhoneCall size={16} /></Button>
            <Button variant="secondary" className="rounded-xl" onClick={() => startCall(u.id, 'video')}><Video size={16} /></Button>
          </>
        ) : profile.relation.outgoingRequest ? (
          <Button variant="secondary" className="flex-1 rounded-xl" disabled>Request sent</Button>
        ) : profile.relation.incomingRequest ? (
          <Button className="flex-1 rounded-xl" disabled={actionLoading} onClick={() => act('accept', 'You are now friends!')}>Accept request</Button>
        ) : profile.relation.blockedByMe ? (
          <Button variant="secondary" className="flex-1 rounded-xl" disabled={actionLoading} onClick={() => act('unblock', 'User unblocked')}>Unblock</Button>
        ) : (
          <Button className="flex-1 rounded-xl" disabled={actionLoading} onClick={() => act('request', 'Friend request sent')}><UserPlus size={16} className="mr-1" />Add friend</Button>
        )}
      </div>

      {/* Bio */}
      {u.bio && (
        <Card className="mx-4 mt-4 border-border p-4 shadow-none">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
          <p className="text-sm leading-relaxed">{u.bio}</p>
        </Card>
      )}

      {/* Details */}
      <Card className="mx-4 mt-3 border-border p-2 shadow-none">
        {u.location && <Detail icon={MapPin} label="Location" value={u.location} />}
        {u.phone && <Detail icon={Phone} label="Phone" value={u.phone} />}
        {u.birthday && <Detail icon={Cake} label="Birthday" value={u.birthday} />}
        {u.education && <Detail icon={GraduationCap} label="Education" value={u.education} />}
        {u.work && <Detail icon={Briefcase} label="Work" value={u.work} />}
        {!u.location && !u.phone && !u.birthday && !u.education && !u.work && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No additional details shared.</p>
        )}
      </Card>

      {!profile.relation.isFriend && !profile.relation.blockedByMe && (
        <div className="mt-4 px-4">
          <Button variant="ghost" className="w-full rounded-xl text-destructive hover:bg-destructive/10" disabled={actionLoading} onClick={() => act('block', 'User blocked')}><Ban size={16} className="mr-1" />Block user</Button>
        </div>
      )}
    </div>
  )

  function startCall(id: string, type: 'audio' | 'video') {
    // dispatch a custom event the CallOverlay listens to
    window.dispatchEvent(new CustomEvent('fc:start-call', { detail: { targetUserId: id, type } }))
  }
}

function Detail({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  )
}

function MyProfile() {
  const { user, refresh } = useAuth()
  const { setView } = useApp()
  const { isOnline } = useSocket()
  const [open, setOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  // Round 9: data URL of the image the user just picked from the camera
  // button. When set, the PhotoCropDialog opens so the user can crop a
  // square region before uploading (ensures every avatar is square).
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  if (!user) return null
  const p = user.profile
  const verified = p?.verified || 'unverified'
  const meOnline = isOnline(user.id)
  const lastActive = meOnline
    ? { label: 'online', detail: 'active now' }
    : formatLastSeenPrecise(p?.lastSeen)

  const fields: { k: string; label: string; value: string }[] = [
    { k: 'bio', label: 'Bio', value: p?.bio || '' },
    { k: 'phone', label: 'Phone', value: p?.phone || '' },
    { k: 'location', label: 'Location', value: p?.location || '' },
    { k: 'birthday', label: 'Birthday', value: p?.birthday || '' },
    { k: 'education', label: 'Education', value: p?.education || '' },
    { k: 'work', label: 'Work', value: p?.work || '' },
  ]

  return (
    <div className="fc-scroll h-full overflow-y-auto pb-6">
      <div className="relative px-4 pb-4">
        <div className="h-24 rounded-b-3xl bg-gradient-to-br from-primary/40 via-primary/20 to-accent" />
        <div className="-mt-12 flex items-end gap-4">
          <div className="relative">
            <UserAvatar name={user.name} src={p?.photoUrl} size={96} filter={p?.photoFilter} verified={verified} className="border-4 border-background" />
            <div className="absolute bottom-1 right-1 flex items-center gap-1">
              <PhotoFilterPicker user={user} refresh={refresh} />
              <label className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    const reader = new FileReader()
                    reader.onload = () => setCropSrc(reader.result as string)
                    reader.onerror = () => toast.error('Could not read image')
                    reader.readAsDataURL(f)
                  }
                  // Always reset so the same file can be re-selected later.
                  e.target.value = ''
                }} />
              </label>
            </div>
          </div>
          <div className="pb-1">
            <h1 className="flex items-center gap-1.5 text-xl font-bold">
              <span>{user.name}</span>
              {verified === 'verified' && (
                <BadgeCheck size={18} className="text-primary" aria-label="Verified" />
              )}
            </h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {lastActive.label !== 'offline' && (
              <p
                className="text-[10px] text-muted-foreground"
                title={lastActive.detail}
              >
                {lastActive.label === 'online' ? 'Active now' : lastActive.detail}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {verified === 'unverified' && (
                <button
                  type="button"
                  onClick={() => setVerifyOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/25"
                >
                  <ShieldCheck size={12} /> Get verified
                </button>
              )}
              {verified === 'pending' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                  <Clock size={12} /> Verification pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <Button className="w-full rounded-xl" onClick={() => setOpen(true)}><Pencil size={16} className="mr-1" />Edit profile</Button>
      </div>

      {p?.bio && (
        <Card className="mx-4 mt-4 border-border p-4 shadow-none">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
          <p className="text-sm leading-relaxed">{p.bio}</p>
        </Card>
      )}

      <Card className="mx-4 mt-3 border-border p-2 shadow-none">
        {fields.map((f) => f.value ? <Detail key={f.k} icon={iconFor(f.k)} label={f.label} value={f.value} /> : null)}
        {fields.every((f) => !f.value) && <p className="px-3 py-4 text-center text-sm text-muted-foreground">No details yet. Tap “Edit profile”.</p>}
      </Card>

      <Card className="mx-4 mt-3 border-border p-4 shadow-none">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Lock size={12} />Privacy</h3>
        <div className="space-y-2 text-sm">
          <PrivacyRow label="Profile visibility" value={p?.profileVisibility || 'PUBLIC'} />
          <PrivacyRow label="Who can message" value={p?.messagePermission || 'FRIENDS'} />
          <PrivacyRow label="Who can call" value={p?.callPermission || 'FRIENDS'} />
        </div>
      </Card>

      <EditProfileDialog open={open} onOpenChange={setOpen} />

      <VerifyDialog open={verifyOpen} onOpenChange={setVerifyOpen} refresh={refresh} />

      {cropSrc && (
        <PhotoCropDialog src={cropSrc} onClose={() => setCropSrc(null)} refresh={refresh} />
      )}
    </div>
  )
}

function iconFor(k: string) {
  switch (k) {
    case 'phone': return Phone
    case 'location': return MapPin
    case 'birthday': return Cake
    case 'education': return GraduationCap
    case 'work': return Briefcase
    default: return Pencil
  }
}

function PrivacyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{value}</span>
    </div>
  )
}

function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { user, refresh } = useAuth()
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && user) {
      setForm({
        name: user.name,
        username: user.username,
        bio: user.profile?.bio || '',
        phone: user.profile?.phone || '',
        location: user.profile?.location || '',
        birthday: user.profile?.birthday || '',
        education: user.profile?.education || '',
        work: user.profile?.work || '',
        profileVisibility: user.profile?.profileVisibility || 'PUBLIC',
        messagePermission: user.profile?.messagePermission || 'FRIENDS',
        callPermission: user.profile?.callPermission || 'FRIENDS',
      })
    }
  }, [open, user])

  const submit = async () => {
    setSaving(true)
    try {
      await api('/api/users/me', { method: 'PUT', body: JSON.stringify(form) })
      await refresh()
      toast.success('Profile updated')
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fc-scroll max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Username</Label><Input value={form.username || ''} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={2} value={form.bio || ''} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Location</Label><Input value={form.location || ''} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Birthday</Label><Input placeholder="YYYY-MM-DD" value={form.birthday || ''} onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Education</Label><Input value={form.education || ''} onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Work</Label><Input value={form.work || ''} onChange={(e) => setForm((f) => ({ ...f, work: e.target.value }))} /></div>
          <div className="rounded-xl border border-border p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Privacy</h4>
            <div className="grid gap-2">
              <SelectField label="Profile visibility" value={form.profileVisibility || 'PUBLIC'} onChange={(v) => setForm((f) => ({ ...f, profileVisibility: v }))} options={['PUBLIC', 'FRIENDS', 'PRIVATE']} />
              <SelectField label="Who can message" value={form.messagePermission || 'FRIENDS'} onChange={(v) => setForm((f) => ({ ...f, messagePermission: v }))} options={['PUBLIC', 'FRIENDS']} />
              <SelectField label="Who can call" value={form.callPermission || 'FRIENDS'} onChange={(v) => setForm((f) => ({ ...f, callPermission: v }))} options={['PUBLIC', 'FRIENDS']} />
            </div>
          </div>
          <Button disabled={saving} onClick={submit} className="rounded-xl">{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * VerifyDialog — Round 10. Opens when the user taps "Get verified" on their
 * own profile. Submits a verification request with an optional reason to
 * POST /api/verify; the backend flips `verified` to "pending" and creates a
 * system notification for review. On success we refresh the session so the
 * profile re-renders with the "Verification pending" badge.
 */
function VerifyDialog({
  open,
  onOpenChange,
  refresh,
}: {
  open: boolean
  onOpenChange: (b: boolean) => void
  refresh: () => Promise<AuthUser | null>
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset the textarea each time the dialog opens.
  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await api('/api/verify', {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      await refresh()
      toast.success('Verification request submitted')
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            Get verified
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Submit a verification request with a brief reason — links to your work, notable public presence, or why your account should be verified. Our team will review it shortly.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="verify-reason">Reason (optional)</Label>
            <Textarea
              id="verify-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why should you be verified?"
              maxLength={500}
            />
            <div className="text-right text-[11px] text-muted-foreground">{reason.length}/500</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="rounded-xl">
            {submitting ? (
              <>
                <Loader2 size={16} className="mr-1 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <ShieldCheck size={16} className="mr-1" />
                Submit request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Preset photo filters for the profile avatar picker.
 * `value` is the CSS filter value sent to the backend (stored on Profile.photoFilter).
 * "none" is the special sentinel meaning "clear the filter".
 */
const PHOTO_FILTERS: { id: string; name: string; value: string }[] = [
  { id: 'none', name: 'None', value: 'none' },
  { id: 'grayscale', name: 'Grayscale', value: 'grayscale(1)' },
  { id: 'sepia', name: 'Sepia', value: 'sepia(0.6)' },
  { id: 'saturate', name: 'Saturate', value: 'saturate(1.5)' },
  { id: 'contrast', name: 'Contrast', value: 'contrast(1.2)' },
  { id: 'brightness', name: 'Bright', value: 'brightness(1.1)' },
  { id: 'vintage', name: 'Vintage', value: 'sepia(0.5) contrast(1.1) brightness(0.95) saturate(1.2)' },
  { id: 'cool', name: 'Cool', value: 'hue-rotate(30deg)' },
  { id: 'warm', name: 'Warm', value: 'hue-rotate(-30deg)' },
]

function PhotoFilterPicker({
  user,
  refresh,
}: {
  user: AuthUser
  refresh: () => Promise<AuthUser | null>
}) {
  const [open, setOpen] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const profile = user.profile
  const current = profile?.photoFilter || 'none'

  const apply = async (value: string) => {
    if (applying) return
    setApplying(value)
    try {
      // Backend treats empty string as null (clears the filter).
      const body = value === 'none' ? { photoFilter: '' } : { photoFilter: value }
      await api('/api/users/me', { method: 'PUT', body: JSON.stringify(body) })
      await refresh()
      toast.success('Photo filter updated')
      setOpen(false)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update filter')
    } finally {
      setApplying(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary shadow-sm transition hover:bg-primary/25"
          aria-label="Photo filters"
          title="Photo filters"
        >
          <Sparkles size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end" sideOffset={8}>
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary" />
          <span className="text-sm font-semibold">Photo filter</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PHOTO_FILTERS.map((f) => {
            const selected = current === f.value
            const isApplying = applying === f.value
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => apply(f.value)}
                disabled={!!applying}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl p-2 transition hover:bg-accent',
                  selected && 'ring-2 ring-primary'
                )}
              >
                <UserAvatar
                  name={user.name}
                  src={profile?.photoUrl}
                  size={48}
                  filter={f.value === 'none' ? undefined : f.value}
                />
                <span className="text-[10px] font-medium text-muted-foreground">{f.name}</span>
                {isApplying && (
                  <span className="absolute inset-0 grid place-items-center rounded-xl bg-background/60">
                    <Loader2 size={14} className="animate-spin text-primary" />
                  </span>
                )}
                {selected && <span className="sr-only">Selected</span>}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Round 9: PhotoCropDialog — replaces the old "upload immediately" flow with
 * a client-side crop step. The parent picks an image and hands us its data
 * URL; we render it in a square viewport with a dark mask outside the crop
 * region, a 1×–3× zoom slider, and drag-to-pan. On Apply we draw the visible
 * square region to a 256×256 canvas, convert it to a JPEG Blob, upload it
 * via `uploadFile`, PUT the new URL to /api/users/me, and refresh the
 * session. The crop step is mandatory (no skip) so every avatar is square.
 */
const CROP_CONTAINER_SIZE = 280
const CROP_OUTPUT_SIZE = 256

function PhotoCropDialog({
  src,
  onClose,
  refresh,
}: {
  src: string
  onClose: () => void
  refresh: () => Promise<AuthUser | null>
}) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [imgSize, setImgSize] = useState<{ nw: number; nh: number } | null>(null)
  const [zoom, setZoom] = useState(1) // 1.0 – 3.0
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [applying, setApplying] = useState(false)
  // Pointer-drag state. Stored in a ref so move/up handlers can read the
  // latest values without re-creating the handlers each render.
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  // Reset transient state when a new image is handed in.
  useEffect(() => {
    setLoaded(false)
    setImgSize(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [src])

  const onImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    setImgSize({ nw: img.naturalWidth, nh: img.naturalHeight })
    setLoaded(true)
  }
  const onImgError = () => {
    toast.error('Could not load image')
    onClose()
  }

  // fillScale = the scale at which the image just fills the container in its
  // smaller dimension (object-cover semantics). At zoom=1 the visible region
  // is the centered square of size min(nw,nh) in natural coords.
  const fillScale = imgSize
    ? CROP_CONTAINER_SIZE / Math.min(imgSize.nw, imgSize.nh)
    : 1
  const effScale = fillScale * zoom
  const scaledW = imgSize ? imgSize.nw * effScale : 0
  const scaledH = imgSize ? imgSize.nh * effScale : 0
  const maxPanX = Math.max(0, (scaledW - CROP_CONTAINER_SIZE) / 2)
  const maxPanY = Math.max(0, (scaledH - CROP_CONTAINER_SIZE) / 2)
  const clampPan = (p: { x: number; y: number }) => ({
    x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
    y: Math.max(-maxPanY, Math.min(maxPanY, p.y)),
  })
  const clampedPan = clampPan(pan)

  const onPointerDown = (e: React.PointerEvent) => {
    if (!loaded) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      // Start from the currently-displayed (clamped) position so consecutive
      // drags don't accumulate out-of-bounds offsets.
      panX: clampedPan.x,
      panY: clampedPan.y,
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan(clampPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy }))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore — pointer may already be released */
    }
  }

  const onZoomChange = (v: number[]) => {
    const newZoom = v[0] / 100
    setZoom(newZoom)
    // Re-clamp pan for the new zoom level so the image never reveals empty
    // space outside its bounds.
    const newEffScale = fillScale * newZoom
    const newScaledW = imgSize ? imgSize.nw * newEffScale : 0
    const newScaledH = imgSize ? imgSize.nh * newEffScale : 0
    const newMaxPanX = Math.max(0, (newScaledW - CROP_CONTAINER_SIZE) / 2)
    const newMaxPanY = Math.max(0, (newScaledH - CROP_CONTAINER_SIZE) / 2)
    setPan((p) => ({
      x: Math.max(-newMaxPanX, Math.min(newMaxPanX, p.x)),
      y: Math.max(-newMaxPanY, Math.min(newMaxPanY, p.y)),
    }))
  }

  // Draw the visible square region to a 256×256 canvas and return a JPEG Blob.
  const cropToBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = imgRef.current
      if (!img || !imgSize) {
        resolve(null)
        return
      }
      // Visible region in displayed-image coords (after transform):
      //   visX = (scaledW - C) / 2 - pan.x
      //   visY = (scaledH - C) / 2 - pan.y
      // Convert to natural coords by dividing by effScale.
      const sx = ((scaledW - CROP_CONTAINER_SIZE) / 2 - clampedPan.x) / effScale
      const sy = ((scaledH - CROP_CONTAINER_SIZE) / 2 - clampedPan.y) / effScale
      const sSize = CROP_CONTAINER_SIZE / effScale
      const canvas = document.createElement('canvas')
      canvas.width = CROP_OUTPUT_SIZE
      canvas.height = CROP_OUTPUT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      // White background in case the source has transparency.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE)
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE)
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    })
  }

  const apply = async () => {
    if (applying) return
    setApplying(true)
    try {
      const blob = await cropToBlob()
      if (!blob) throw new Error('Could not crop image')
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      const { file: uploaded } = await uploadFile(file)
      await api('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ photoUrl: uploaded.url }),
      })
      await refresh()
      toast.success('Photo updated')
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update photo')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crop size={16} className="text-primary" />
            Crop photo
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <div
            className="relative mx-auto grid touch-none select-none place-items-center overflow-hidden rounded-xl bg-zinc-900"
            style={{ width: CROP_CONTAINER_SIZE, height: CROP_CONTAINER_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src && (
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                onLoad={onImgLoad}
                onError={onImgError}
                draggable={false}
                className="pointer-events-none max-w-none select-none"
                style={{
                  width: imgSize ? imgSize.nw * fillScale : 'auto',
                  height: imgSize ? imgSize.nh * fillScale : 'auto',
                  transform: `translate(${clampedPan.x}px, ${clampedPan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  opacity: loaded ? 1 : 0,
                }}
              />
            )}
            {/* Crop overlay: square white border + dark shadow outside the
                crop region. Pointer events disabled so the underlying image
                receives the drag. */}
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  width: CROP_CONTAINER_SIZE,
                  height: CROP_CONTAINER_SIZE,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  border: '2px solid white',
                }}
              />
            </div>
            {!loaded && (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="animate-spin text-white/80" size={24} />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Zoom</span>
                <span>{zoom.toFixed(1)}×</span>
              </div>
              <Slider
                value={[Math.round(zoom * 100)]}
                min={100}
                max={300}
                step={1}
                onValueChange={onZoomChange}
                disabled={!loaded}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Drag to reposition. The crop is always square — what you see in
              the box is what becomes your photo.
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={applying}
          >
            <X size={16} className="mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!loaded || applying}
          >
            {applying ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <Check size={16} className="mr-1" />
            )}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
