'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { api, timeAgo } from '@/lib/api'
import { useApp } from '@/lib/store'
import { useSocket } from '@/hooks/use-socket'
import { UserAvatar, EmptyState } from '@/components/fc/ui'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Phone,
  Video,
  PhoneCall,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  Clock,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CallHistoryItem {
  id: string
  type: 'audio' | 'video'
  status: string
  direction: 'incoming' | 'outgoing'
  peerId: string
  peerName: string
  peerPhoto: string | null
  startedAt: string
  endedAt: string | null
  duration: number | null
}

interface Friend {
  id: string
  name: string
  photoUrl: string | null
  lastSeen: string | null
}

interface CallStats {
  total: number
  connected: number
  missed: number
  declined: number
  outgoing: number
  incoming: number
  audioCalls: number
  videoCalls: number
  totalDurationSec: number
  totalDurationLabel: string
  avgDurationSec: number
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function isMissedStatus(status: string): boolean {
  return (
    status === 'missed' ||
    status === 'declined' ||
    status === 'failed' ||
    status === 'no-answer'
  )
}

export function CallsView() {
  const [calls, setCalls] = useState<CallHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CallStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const { openChat } = useApp()
  const { isOnline } = useSocket()

  const loadCalls = useCallback(async () => {
    try {
      const data = await api<{ calls: CallHistoryItem[] }>('/api/calls')
      setCalls(data.calls || [])
    } catch {
      // silent fail — empty state will show
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await api<{ stats: CallStats }>('/api/calls/stats')
      setStats(data.stats || null)
    } catch {
      // silent fail — stats card just won't render
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true)
    try {
      const data = await api<{ friends: Friend[] }>('/api/friends')
      setFriends(data.friends || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load friends')
    } finally {
      setFriendsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCalls()
    loadStats()
  }, [loadCalls, loadStats])

  const openStartDialog = useCallback(() => {
    setDialogOpen(true)
    loadFriends()
  }, [loadFriends])

  const startCall = useCallback((targetUserId: string, type: 'audio' | 'video') => {
    setStarting(targetUserId + type)
    window.dispatchEvent(
      new CustomEvent('fc:start-call', { detail: { targetUserId, type } })
    )
    setDialogOpen(false)
    setStarting(null)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Calls</h1>
            <p className="text-xs text-muted-foreground">
              {calls.length > 0 ? `${calls.length} recent` : 'No active calls'}
            </p>
          </div>
          <Button size="sm" className="rounded-full" onClick={openStartDialog}>
            <PhoneCall size={14} className="mr-1.5" /> Start a call
          </Button>
        </div>
      </div>

      <div className="fc-scroll flex-1 overflow-y-auto p-2">
        {statsLoading ? (
          <div className="m-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl bg-background/60 p-2.5">
                  <Skeleton className="mb-2 h-4 w-4 rounded" />
                  <Skeleton className="mb-1.5 h-6 w-10" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-3 h-2 w-full rounded-full" />
          </div>
        ) : stats && stats.total > 0 ? (
          <CallStatsCard stats={stats} />
        ) : null}
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            ))}
          </div>
        ) : calls.length === 0 ? (
          <EmptyState
            icon={<PhoneCall size={40} />}
            title="No calls yet"
            description="Start a call with a friend. Your call history will appear here."
            action={
              <Button className="mt-2 rounded-full" onClick={openStartDialog}>
                <Plus size={14} className="mr-1.5" /> Start a call
              </Button>
            }
          />
        ) : (
          <div className="space-y-0.5">
            {calls.map((c) => (
              <CallRow key={c.id} call={c} onClick={() => openChat(c.peerId)} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall size={18} className="text-primary" /> Start a call
            </DialogTitle>
            <DialogDescription>
              Pick a friend and choose audio or video.
            </DialogDescription>
          </DialogHeader>
          <div className="fc-scroll max-h-[60vh] overflow-y-auto px-2 pb-4">
            {friendsLoading ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <EmptyState
                icon={<Users size={32} />}
                title="No friends yet"
                description="Add friends first to start calling."
              />
            ) : (
              <div className="space-y-0.5">
                {friends.map((f) => {
                  const online = isOnline(f.id)
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent/40"
                    >
                      <UserAvatar
                        name={f.name}
                        src={f.photoUrl}
                        size={40}
                        online={online}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{f.name}</div>
                        <div
                          className={cn(
                            'text-xs',
                            online ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {online ? 'online' : 'offline'}
                        </div>
                      </div>
                      <button
                        onClick={() => startCall(f.id, 'audio')}
                        disabled={starting === f.id + 'audio'}
                        className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/25 disabled:opacity-50"
                        title="Audio call"
                        aria-label={`Audio call ${f.name}`}
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        onClick={() => startCall(f.id, 'video')}
                        disabled={starting === f.id + 'video'}
                        className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/25 disabled:opacity-50"
                        title="Video call"
                        aria-label={`Video call ${f.name}`}
                      >
                        <Video size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CallRow({
  call,
  onClick,
}: {
  call: CallHistoryItem
  onClick: () => void
}) {
  const missed = isMissedStatus(call.status)
  const isIncoming = call.direction === 'incoming'
  const isVideo = call.type === 'video'

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-accent/40 active:bg-accent/60"
    >
      <UserAvatar name={call.peerName} src={call.peerPhoto} size={44} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm font-semibold',
            missed && 'text-destructive'
          )}
        >
          {call.peerName}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {isIncoming ? (
            <ArrowDownLeft
              size={13}
              className={cn(missed ? 'text-destructive' : 'text-primary')}
            />
          ) : (
            <ArrowUpRight
              size={13}
              className={cn(missed ? 'text-destructive' : 'text-primary')}
            />
          )}
          <span className="truncate">
            {missed ? 'Missed' : isIncoming ? 'Incoming' : 'Outgoing'}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="truncate">
            {call.duration
              ? formatDuration(call.duration)
              : timeAgo(call.startedAt)}
          </span>
        </div>
      </div>
      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
        {isVideo ? <Video size={16} /> : <Phone size={16} />}
      </div>
    </button>
  )
}

function CallStatsCard({ stats }: { stats: CallStats }) {
  const outPct =
    stats.total > 0 ? Math.round((stats.outgoing / stats.total) * 100) : 50
  const inPct = 100 - outPct
  return (
    <div className="m-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <TrendingUp size={15} className="text-primary" />
          Call statistics
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          All time
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <StatTile
          icon={<PhoneCall size={15} />}
          value={stats.total}
          label="Total calls"
        />
        <StatTile
          icon={<Phone size={15} />}
          value={stats.connected}
          label="Connected"
        />
        <StatTile
          icon={<PhoneMissed size={15} />}
          value={stats.missed}
          label="Missed"
          valueClass={stats.missed > 0 ? 'text-destructive' : undefined}
          iconClass={stats.missed > 0 ? 'text-destructive' : undefined}
        />
        <StatTile
          icon={<Clock size={15} />}
          value={stats.totalDurationLabel}
          label="Total duration"
          isText
        />
        <StatTile
          icon={<Mic size={15} />}
          value={stats.audioCalls}
          label="Audio calls"
        />
        <StatTile
          icon={<Video size={15} />}
          value={stats.videoCalls}
          label="Video calls"
        />
      </div>

      {/* Outgoing vs Incoming ratio bar */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium">
          <span className="flex items-center gap-1 text-muted-foreground">
            <PhoneOutgoing size={12} className="text-primary" />
            Outgoing
            <span className="ml-0.5 text-foreground">{stats.outgoing}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="mr-0.5 text-foreground">{stats.incoming}</span>
            Incoming
            <PhoneIncoming size={12} className="text-primary" />
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${outPct}%` }}
            title={`${stats.outgoing} outgoing (${outPct}%)`}
          />
          <div
            className="h-full bg-primary/40 transition-all"
            style={{ width: `${inPct}%` }}
            title={`${stats.incoming} incoming (${inPct}%)`}
          />
        </div>
      </div>

      {/* Avg duration footer */}
      {stats.avgDurationSec > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp size={11} className="text-primary" />
          Avg call duration:&nbsp;
          <span className="font-medium text-foreground">
            {formatDuration(stats.avgDurationSec)}
          </span>
        </div>
      )}
    </div>
  )
}

function StatTile({
  icon,
  value,
  label,
  valueClass,
  iconClass,
  isText,
}: {
  icon: ReactNode
  value: number | string
  label: string
  valueClass?: string
  iconClass?: string
  isText?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-background/60 p-2.5">
      <div
        className={cn(
          'grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary',
          iconClass
        )}
      >
        {icon}
      </div>
      <div
        className={cn(
          'leading-none text-foreground',
          isText ? 'text-lg font-bold' : 'text-2xl font-bold',
          valueClass
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
