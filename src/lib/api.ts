export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
    credentials: 'include',
  })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status)
  }
  return data as T
}

export async function uploadFile(file: File): Promise<{ file: { id: string; url: string; name: string; mimeType: string; size: number } }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/files/upload', { method: 'POST', body: form, credentials: 'include' })
  const data = await res.json()
  if (!res.ok) throw new ApiError(data?.error || 'Upload failed', res.status)
  return data
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString()
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Returns true when `d` falls on the calendar day immediately before `now`.
 * (Used so "yesterday" wins over raw hour-counting when it makes more sense.)
 */
function isYesterday(d: Date, now: Date): boolean {
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()
}

function shortMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * Granular last-seen label for chat headers / conversation rows.
 * Backward-compatible: same name + signature as the original helper.
 *
 *  - online            -> "online"
 *  - null / invalid    -> "offline"
 *  - < 1 min           -> "last seen just now"
 *  - < 1 hour          -> "last seen {n}m ago"
 *  - < 24 hours        -> "last seen {n}h ago"
 *  - calendar yesterday -> "last seen yesterday"
 *  - < 7 days          -> "last seen {n}d ago"
 *  - older             -> "last seen {MMM d}" (e.g. "last seen Jan 5")
 */
export function lastSeenText(online: boolean, lastSeen: string | null | undefined): string {
  if (online) return 'online'
  if (!lastSeen) return 'offline'
  const d = new Date(lastSeen)
  if (isNaN(d.getTime())) return 'offline'
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  // Clock-skew safety: a lastSeen in the future means the user is online.
  if (diff < 0) return 'online'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'last seen just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `last seen ${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `last seen ${hr}h ago`
  if (isYesterday(d, now)) return 'last seen yesterday'
  const day = Math.floor(hr / 24)
  if (day < 7) return `last seen ${day}d ago`
  return `last seen ${shortMonthDay(lastSeen)}`
}

/**
 * Precise last-seen info for the profile view.
 * Returns a short label ("online" / "offline" / "5m" / "2h" / "yesterday" /
 * "Jan 5") and a longer detail string ("last seen 5 minutes ago at 3:42 PM").
 *
 * The function only inspects `lastSeen` — combine with the `online` flag from
 * `useSocket().isOnline(userId)` at the call site if you want "online" to win
 * over a recent timestamp.
 */
export function formatLastSeenPrecise(lastSeen: string | null | undefined): { label: string; detail: string } {
  if (!lastSeen) return { label: 'offline', detail: 'offline' }
  const d = new Date(lastSeen)
  if (isNaN(d.getTime())) return { label: 'offline', detail: 'offline' }
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  // Treat a lastSeen within the last 30s (or in the future due to clock skew)
  // as effectively online — the realtime service updates lastSeen on
  // disconnect, so a fresh timestamp means the socket was just alive.
  if (diff < 30_000) return { label: 'online', detail: 'active now' }
  const clock = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return { label: 'now', detail: `last seen just now at ${clock}` }
  const min = Math.floor(sec / 60)
  if (min < 60) return { label: `${min}m`, detail: `last seen ${min} minute${min === 1 ? '' : 's'} ago at ${clock}` }
  const hr = Math.floor(min / 60)
  if (hr < 24) return { label: `${hr}h`, detail: `last seen ${hr} hour${hr === 1 ? '' : 's'} ago at ${clock}` }
  if (isYesterday(d, now)) return { label: 'yesterday', detail: `last seen yesterday at ${clock}` }
  const day = Math.floor(hr / 24)
  if (day < 7) return { label: `${day}d`, detail: `last seen ${day} day${day === 1 ? '' : 's'} ago at ${clock}` }
  const dateStr = shortMonthDay(lastSeen)
  return { label: dateStr, detail: `last seen ${dateStr} at ${clock}` }
}
