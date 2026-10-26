'use client'

import { useState } from 'react'
import { useApp, View } from '@/lib/store'
import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/hooks/use-notifications'
import { FCLogo, UserAvatar } from '@/components/fc/ui'
import { cn } from '@/lib/utils'
import { Home, Users, MessageCircle, Phone, Bell, User as UserIcon, Settings, Menu, Moon, Sun, Megaphone, Shield } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BroadcastsView } from '@/components/fc/broadcasts/BroadcastsView'
import { AdminView } from '@/components/fc/admin/AdminView'
import { toast } from 'sonner'

const TABS: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'friends', label: 'Friends', icon: Users },
  { view: 'chat', label: 'Chats', icon: MessageCircle },
  { view: 'calls', label: 'Calls', icon: Phone },
  { view: 'profile', label: 'Profile', icon: UserIcon },
]

export function BottomNav() {
  const { view, setView } = useApp()
  const { unread } = useNotifications()
  return (
    <nav className="fc-safe-bottom sticky bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map((t) => {
          const active = view === t.view
          const Icon = t.icon
          const showBadge = t.view === 'chat' // chat badge handled separately if needed
          return (
            <button
              key={t.view}
              onClick={() => setView(t.view)}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {t.view === 'friends' && unread > 0 && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span>{t.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function TopBar() {
  const { setView } = useApp()
  const { user, logout } = useAuth()
  const { unread } = useNotifications()
  const { theme, setTheme } = useTheme()
  const [broadcastsOpen, setBroadcastsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const isAdmin = user?.role === 'admin'

  return (
    <header className="fc-safe-top sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <button onClick={() => setView('home')} className="flex items-center gap-2">
          <FCLogo size={32} />
          <div className="leading-none">
            <div className="text-base font-bold tracking-tight">FriendConnect</div>
            <div className="text-[10px] text-muted-foreground">Private social</div>
          </div>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setView('notifications')}
            className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-2 ring-transparent transition hover:ring-primary/30">
                <UserAvatar name={user?.name || 'Me'} src={user?.profile?.photoUrl} size={34} verified={user?.profile?.verified} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate font-medium">{user?.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">@{user?.username}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView('profile')}>
                <UserIcon size={16} className="mr-2" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBroadcastsOpen(true)}>
                <Megaphone size={16} className="mr-2" /> Broadcasts
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setAdminOpen(true)}>
                  <Shield size={16} className="mr-2" /> Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setView('settings')}>
                <Settings size={16} className="mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  await logout()
                  toast.success('Logged out')
                }}
              >
                <Menu size={16} className="mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <BroadcastsView open={broadcastsOpen} onOpenChange={setBroadcastsOpen} />
      <AdminView open={adminOpen} onOpenChange={setAdminOpen} />
    </header>
  )
}
