'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Check } from 'lucide-react'
import { initials } from '@/lib/api'
import { cn } from '@/lib/utils'

export function UserAvatar({
  name,
  src,
  size = 40,
  online,
  className,
  filter,
  verified,
}: {
  name: string
  src?: string | null
  size?: number
  online?: boolean
  className?: string
  /** Optional CSS filter (e.g. "grayscale(1)", "sepia(0.6)") applied to the AvatarImage only. */
  filter?: string | null
  /** Verification status: "unverified" | "pending" | "verified". When "verified",
   * renders a small verified badge (emerald circle + white Check) at the
   * bottom-right of the avatar. When the online dot is also shown, it shifts
   * to the top-right corner so both indicators remain visible. */
  verified?: string
}) {
  // Normalize: null/undefined/''/'none' all mean "no filter".
  const activeFilter = filter && filter !== 'none' ? filter : undefined
  const isVerified = verified === 'verified'
  // When a verified badge occupies the bottom-right corner, move the online
  // dot to the top-right corner so both indicators render without overlap.
  const onlineDotPosition = isVerified ? 'absolute top-0 right-0' : 'absolute -bottom-0 -right-0'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Avatar style={{ width: size, height: size }} className={cn('ring-1 ring-border', className)}>
        {src ? <AvatarImage src={src} alt={name} style={activeFilter ? { filter: activeFilter } : undefined} /> : null}
        <AvatarFallback className="bg-primary/15 text-primary font-semibold" style={{ fontSize: size * 0.36 }}>
          {initials(name) || '?'}
        </AvatarFallback>
      </Avatar>
      {online !== undefined && (
        <span
          className={cn(
            'rounded-full border-2 border-background',
            onlineDotPosition,
            online ? 'fc-online-dot' : 'bg-muted-foreground'
          )}
          style={{ width: Math.max(8, size * 0.3), height: Math.max(8, size * 0.3) }}
        />
      )}
      {isVerified && (
        <span
          className="absolute -bottom-0 -right-0 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground border-2 border-background"
          aria-label="Verified"
          title="Verified"
        >
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </div>
  )
}

export function FCLogo({ size = 40, className }: { size?: number; className?: string }) {
  // Prefer the uploaded brand logo (/friendconnect-logo.png). If it fails to
  // load (missing file, offline, blocked, etc.) we transparently fall back to
  // the original SVG mark so the logo always renders.
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div
      className={cn(
        'relative grid place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30',
        className
      )}
      style={{ width: size, height: size }}
    >
      {!imgFailed ? (
        <img
          src="/friendconnect-logo.png"
          alt="FriendConnect logo"
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          width={size * 0.62}
          height={size * 0.62}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 6a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3 3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
          <path d="M9 18H6a3 3 0 0 1-3-3v-1" />
          <circle cx="6" cy="6" r="3" />
          <path d="m9 12-1.5 1.5" />
        </svg>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
      {icon && <div className="text-muted-foreground/60">{icon}</div>}
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1', className)}>{children}</h2>
}
