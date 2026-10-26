'use client'

import { useNotifications } from '@/hooks/use-notifications'
import { useApp } from '@/lib/store'
import { UserAvatar, EmptyState } from '@/components/fc/ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCheck, Bell, UserPlus, MessageCircle, Phone, Users, Info } from 'lucide-react'
import { timeAgo } from '@/lib/api'
import { cn } from '@/lib/utils'

const ICONS: Record<string, typeof Bell> = {
  friend_request: UserPlus,
  message: MessageCircle,
  call: Phone,
  group: Users,
  system: Info,
}

export function NotificationsView() {
  const { notifications, unread, markAllRead, refresh } = useNotifications()
  const { openChat, openProfile, setView, openGroupChat } = useApp()

  const handleClick = (n: typeof notifications[number]) => {
    if (!n.read) markAllRead()
    const d = n.data || {}
    if (n.type === 'friend_request') {
      if (d.from) openProfile(d.from)
      else setView('friends')
    } else if (n.type === 'message') {
      if (d.from) openChat(d.from)
      else setView('chat')
    } else if (n.type === 'call') {
      setView('calls')
    } else if (n.type === 'group') {
      if (d.groupId) openGroupChat(d.groupId)
      else setView('groups')
    } else {
      setView('home')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          {unread > 0 && <p className="text-xs text-muted-foreground">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <Button size="sm" variant="ghost" className="rounded-full" onClick={markAllRead}>
            <CheckCheck size={14} className="mr-1" /> Mark all read
          </Button>
        )}
      </div>
      <div className="fc-scroll flex-1 overflow-y-auto p-3">
        {notifications.length === 0 ? (
          <EmptyState icon={<Bell size={40} />} title="All caught up" description="You have no notifications yet." />
        ) : (
          <div className="space-y-1.5">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Bell
              const d = n.data || {}
              return (
                <Card
                  key={n.id}
                  className={cn('flex cursor-pointer items-center gap-3 border p-3 shadow-none transition hover:bg-accent/40', n.read ? 'bg-card' : 'border-primary/30 bg-primary/5')}
                  onClick={() => handleClick(n)}
                >
                  <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', n.read ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary')}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)} ago</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
