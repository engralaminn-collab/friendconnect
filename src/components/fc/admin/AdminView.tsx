'use client'

/**
 * Admin Dashboard — a full-screen Dialog opened from the avatar dropdown
 * (TopBar). Renders platform analytics, activity, security rates, and a
 * filterable audit log. Visible ONLY when `useAuth().user.role === 'admin'`.
 *
 * Backend contracts (round 11, see worklog Task 21-backend):
 *   GET /api/admin/analytics → { totals, activity, security }
 *   GET /api/admin/audit?limit=100&action=X → { logs: [{ id, action, resource, ip, userAgent, meta, createdAt, user }] }
 *
 * Both endpoints return 403 for non-admins — the entry in the dropdown is
 * hidden for non-admins so we should never hit this in normal usage, but
 * every fetch is defensively wrapped to surface a friendly error toast.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, timeAgo } from '@/lib/api'
import { toast } from 'sonner'
import {
  Shield,
  Users,
  MessageCircle,
  Phone,
  Image as ImageIcon,
  Activity,
  Smartphone,
  HardDrive,
  MailCheck,
  Lock,
  Loader2,
  RefreshCw,
  UserCheck,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---- API types -------------------------------------------------------------

interface AnalyticsData {
  totals: {
    users: number
    messages: number
    groups: number
    calls: number
    stories: number
    sessions: number
    files: number
    verifiedUsers: number
    twoFactorUsers: number
    archivedChats: number
  }
  activity: {
    newUsers7d: number
    messages24h: number
  }
  security: {
    verifiedRate: number
    twoFactorRate: number
  }
}

interface AuditLog {
  id: string
  action: string
  resource: string | null
  ip: string | null
  userAgent: string | null
  meta: Record<string, any> | null
  createdAt: string
  user: { id: string; name: string; username: string } | null
}

// ---- Main view -------------------------------------------------------------

export function AdminView({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loadingA, setLoadingA] = useState(false)
  const [loadingL, setLoadingL] = useState(false)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const loadAnalytics = useCallback(async () => {
    setLoadingA(true)
    try {
      const data = await api<AnalyticsData>('/api/admin/analytics')
      setAnalytics(data)
    } catch (e: any) {
      if (e?.status === 403) {
        toast.error('Admins only')
      } else {
        toast.error(e?.message || 'Failed to load analytics')
      }
    } finally {
      setLoadingA(false)
    }
  }, [])

  const loadLogs = useCallback(async (action?: string) => {
    setLoadingL(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (action && action !== 'all') params.set('action', action)
      const data = await api<{ logs: AuditLog[] }>(`/api/admin/audit?${params.toString()}`)
      setLogs(data.logs || [])
    } catch (e: any) {
      if (e?.status !== 403) {
        toast.error(e?.message || 'Failed to load audit log')
      }
    } finally {
      setLoadingL(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadAnalytics()
      loadLogs(actionFilter)
    }
  }, [open])

  const onFilterChange = (v: string) => {
    setActionFilter(v)
    loadLogs(v)
  }

  const refreshAll = () => {
    loadAnalytics()
    loadLogs(actionFilter)
  }

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.trim().toLowerCase()
    return logs.filter((l) => {
      return (
        l.action.toLowerCase().includes(q) ||
        (l.resource || '').toLowerCase().includes(q) ||
        (l.ip || '').toLowerCase().includes(q) ||
        (l.user?.name || '').toLowerCase().includes(q) ||
        (l.user?.username || '').toLowerCase().includes(q)
      )
    })
  }, [logs, search])

  // Distinct action values from already-loaded logs — drives the filter dropdown.
  const actionOptions = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => set.add(l.action))
    return Array.from(set).sort()
  }, [logs])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Header */}
        <DialogHeader className="shrink-0 gap-1 border-b border-border bg-background/95 px-5 pb-4 pt-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Shield size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                Admin Dashboard
                <Badge variant="default" className="bg-primary/15 text-primary">
                  <Lock size={10} /> Admin
                </Badge>
              </DialogTitle>
              <DialogDescription className="truncate">
                Platform analytics, security posture, and audit log.
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshAll}
              disabled={loadingA || loadingL}
              aria-label="Refresh"
            >
              {loadingA || loadingL ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <RefreshCw size={14} className="mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="fc-scroll flex-1 overflow-y-auto px-4 py-4">
          {/* Analytics stat tiles */}
          <section>
            <SectionLabel>Platform totals</SectionLabel>
            {loadingA && !analytics ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-[88px] animate-pulse rounded-xl border border-border bg-card" />
                ))}
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile icon={<Users size={16} />} value={analytics.totals.users} label="Total users" />
                <StatTile icon={<MessageCircle size={16} />} value={analytics.totals.messages} label="Messages" />
                <StatTile icon={<Users size={16} />} value={analytics.totals.groups} label="Groups" />
                <StatTile icon={<Phone size={16} />} value={analytics.totals.calls} label="Calls" />
                <StatTile icon={<ImageIcon size={16} />} value={analytics.totals.stories} label="Stories" />
                <StatTile icon={<Smartphone size={16} />} value={analytics.totals.sessions} label="Active sessions" />
                <StatTile icon={<HardDrive size={16} />} value={analytics.totals.files} label="Files" />
                <StatTile icon={<MailCheck size={16} />} value={analytics.totals.verifiedUsers} label="Verified users" />
                <StatTile icon={<Lock size={16} />} value={analytics.totals.twoFactorUsers} label="2FA users" />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Analytics unavailable.
              </div>
            )}
          </section>

          {/* Activity + Security */}
          {analytics && (
            <>
              <section className="mt-6">
                <SectionLabel>Activity</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    icon={<UserCheck size={16} />}
                    value={analytics.activity.newUsers7d}
                    label="New users (7d)"
                  />
                  <StatTile
                    icon={<Activity size={16} />}
                    value={analytics.activity.messages24h}
                    label="Messages (24h)"
                  />
                </div>
              </section>

              <section className="mt-6">
                <SectionLabel>Security posture</SectionLabel>
                <div className="space-y-3">
                  <SecurityRow
                    icon={<MailCheck size={16} />}
                    label="Email verification rate"
                    percent={analytics.security.verifiedRate}
                    hint={`${analytics.totals.verifiedUsers} of ${analytics.totals.users} users verified`}
                  />
                  <SecurityRow
                    icon={<Lock size={16} />}
                    label="2FA adoption rate"
                    percent={analytics.security.twoFactorRate}
                    hint={`${analytics.totals.twoFactorUsers} of ${analytics.totals.users} users with 2FA on`}
                  />
                </div>
              </section>
            </>
          )}

          {/* Audit log */}
          <section className="mt-6">
            <SectionLabel>Audit log</SectionLabel>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Select value={actionFilter} onValueChange={onFilterChange}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search by user, IP, resource…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {loadingL && logs.length === 0 ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                  <AlertTriangle size={14} />
                  No audit entries
                </div>
              ) : (
                <ul className="fc-scroll max-h-80 divide-y divide-border overflow-y-auto">
                  {filteredLogs.map((l) => (
                    <AuditRow key={l.id} log={l} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---- Sub-components --------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{formatCount(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function SecurityRow({
  icon,
  label,
  percent,
  hint,
}: {
  icon: React.ReactNode
  label: string
  percent: number
  hint: string
}) {
  const warn = percent < 25
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className={cn('text-2xl font-bold tabular-nums', warn ? 'text-amber-600' : 'text-primary')}>
          {percent}%
        </div>
      </div>
      <Progress value={percent} className="mt-2 h-2" />
    </div>
  )
}

function AuditRow({ log }: { log: AuditLog }) {
  const user = log.user
  return (
    <li className="rounded-lg p-2 transition-colors hover:bg-accent/40">
      <div className="flex items-center gap-2">
        <ActionBadge action={log.action} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {user ? user.name : 'System'}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground" title={log.createdAt}>
          {timeAgo(log.createdAt)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        {user && <span className="truncate">@{user.username}</span>}
        {user && log.resource && <span aria-hidden>·</span>}
        {log.resource && <span className="truncate">{log.resource}</span>}
        {(user || log.resource) && log.ip && <span aria-hidden>·</span>}
        {log.ip && <span className="font-mono">{log.ip}</span>}
      </div>
    </li>
  )
}

// Color-code audit actions by category so the audit log is skimmable.
function ActionBadge({ action }: { action: string }) {
  const { className, label } = badgeStyleFor(action)
  return (
    <Badge variant="outline" className={cn('shrink-0 font-mono text-[10px] uppercase', className)}>
      {label}
    </Badge>
  )
}

function badgeStyleFor(action: string): { className: string; label: string } {
  const a = action.toLowerCase()
  // auth-related
  if (a.includes('login') || a.includes('logout') || a.includes('register')) {
    return { className: 'border-primary/30 bg-primary/10 text-primary', label: action }
  }
  // security: 2FA, email verify
  if (a.includes('2fa') || a.includes('email') || a.includes('password')) {
    return { className: 'border-emerald-300/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300', label: action }
  }
  // destructive: delete, revoke, block
  if (a.includes('delete') || a.includes('remove') || a.includes('revoke') || a.includes('block') || a.includes('disable')) {
    return { className: 'border-destructive/30 bg-destructive/10 text-destructive', label: action }
  }
  // create / update / upload
  if (a.includes('create') || a.includes('update') || a.includes('upload') || a.includes('send') || a.includes('enable')) {
    return { className: 'border-teal-300/40 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-300', label: action }
  }
  return { className: 'border-border bg-muted/40 text-muted-foreground', label: action }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
