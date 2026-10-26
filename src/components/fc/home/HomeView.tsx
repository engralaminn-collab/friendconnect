'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSocket } from '@/hooks/use-socket'
import { useApp } from '@/lib/store'
import { api, timeAgo, clockTime } from '@/lib/api'
import { UserAvatar, EmptyState, SectionTitle } from '@/components/fc/ui'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Users, MessageCircle, Phone, Video, UserPlus, Sparkles, ChevronRight, Clock } from 'lucide-react'
import { StoriesBar } from '@/components/fc/stories/StoriesBar'
import { cn } from '@/lib/utils'

interface Friend {
  id: string
  username: string
  name: string
  photoUrl: string | null
  lastSeen: string | null
}
interface Conversation {
  id: string
  username: string
  name: string
  photoUrl: string | null
  unread: number
  lastMessage: { content: string; type: string; senderId: string; createdAt: string; status: string } | null
}
interface Suggestion {
  id: string
  username: string
  name: string
  photoUrl: string | null
  bio: string | null
  location: string | null
  mutualFriends: number
}

export function HomeView() {
  const { user } = useAuth()
  const { isOnline } = useSocket()
  const { openChat, setView, openProfile } = useApp()
  const [friends, setFriends] = useState<Friend[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)

  const load = async () => {
    try {
      const [fr, cv, sg] = await Promise.all([
        api<{ friends: Friend[] }>('/api/friends'),
        api<{ conversations: Conversation[] }>('/api/messages/conversations'),
        api<{ suggestions: Suggestion[] }>('/api/friends/suggestions'),
      ])
      setFriends(fr.friends)
      setConversations(cv.conversations)
      setSuggestions(sg.suggestions)
    } catch {}
  }

  const loadOnline = async () => {
    try {
      const data = await api<{ online: Friend[] }>('/api/friends/online')
      setOnlineFriends(data.online)
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  // Online-friends widget auto-refreshes every 30s. The socket presence set is
  // cross-checked below to surface friends who may be connected even if their
  // profile.lastSeen is older than the API's 2-minute threshold.
  useEffect(() => {
    loadOnline()
    const t = setInterval(loadOnline, 30000)
    return () => clearInterval(t)
  }, [])

  // Combine the REST online list with the realtime socket presence set.
  // A friend is considered online if EITHER source reports them as online.
  const onlineList = useMemo(() => {
    const byId = new Map<string, Friend>()
    onlineFriends.forEach((f) => byId.set(f.id, f))
    friends.forEach((f) => {
      if (isOnline(f.id)) byId.set(f.id, f)
    })
    return Array.from(byId.values())
  }, [onlineFriends, friends, isOnline])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || 'friend'

  return (
    <div className="fc-scroll h-full overflow-y-auto pb-6">
      {/* Stories bar */}
      <div className="px-4 pt-4">
        <StoriesBar />
      </div>

      {/* Hero greeting */}
      <div className="relative overflow-hidden px-4 pt-5 pb-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="flex items-center gap-3">
          <UserAvatar name={user?.name || 'Me'} src={user?.profile?.photoUrl} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{greeting},</p>
            <h1 className="truncate text-xl font-bold">{firstName} 👋</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          You have <span className="font-semibold text-foreground">{friends.length}</span> friends ·{' '}
          <span className="font-semibold text-foreground">{conversations.reduce((a, c) => a + c.unread, 0)}</span> unread messages
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 px-4">
        {[
          { icon: Search, label: 'Find', action: () => setView('friends') },
          { icon: MessageCircle, label: 'Chat', action: () => setView('chat') },
          { icon: Video, label: 'Call', action: () => setView('calls') },
          { icon: Users, label: 'Groups', action: () => setView('groups') },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.action}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 transition active:scale-95 hover:border-primary/40 hover:bg-accent/40"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <a.icon size={20} />
            </div>
            <span className="text-[11px] font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Online now — live widget (hidden when no friends online) */}
      {onlineList.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between px-4">
            <SectionTitle className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Online now
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
                {onlineList.length}
              </span>
            </SectionTitle>
          </div>
          <div className="fc-no-scroll mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
            {onlineList.map((f) => (
              <button
                key={f.id}
                onClick={() => openChat(f.id)}
                className="flex w-16 flex-col items-center gap-1"
                aria-label={`Chat with ${f.name}`}
              >
                <div className="relative">
                  {/* Subtle pulsing ring (live halo) */}
                  <span
                    aria-hidden="true"
                    className="fc-pulse pointer-events-none absolute -inset-1 rounded-full bg-primary/20"
                  />
                  <UserAvatar name={f.name} src={f.photoUrl} size={56} online />
                </div>
                <span className="w-full truncate text-center text-[11px]">{f.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Friends strip */}
      {friends.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between px-4">
            <SectionTitle>Friends</SectionTitle>
            <button onClick={() => setView('friends')} className="text-xs font-medium text-primary hover:underline">See all</button>
          </div>
          <div className="fc-no-scroll mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
            {friends.slice(0, 12).map((f) => (
              <button key={f.id} onClick={() => openChat(f.id)} className="flex w-16 flex-col items-center gap-1">
                <UserAvatar name={f.name} src={f.photoUrl} size={56} online />
                <span className="w-full truncate text-center text-[11px]">{f.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent conversations */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-4">
          <SectionTitle>Recent chats</SectionTitle>
          <button onClick={() => setView('chat')} className="text-xs font-medium text-primary hover:underline">See all</button>
        </div>
        <div className="mt-2 divide-y divide-border">
          {conversations.length === 0 ? (
            <EmptyState icon={<MessageCircle size={36} />} title="No conversations yet" description="Find a friend and start chatting." action={<Button size="sm" onClick={() => setView('friends')}><UserPlus size={14} className="mr-1" />Find friends</Button>} />
          ) : (
            conversations.slice(0, 5).map((c) => (
              <button key={c.id} onClick={() => openChat(c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent/40">
                <UserAvatar name={c.name} src={c.photoUrl} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    {c.lastMessage && <span className="shrink-0 text-[10px] text-muted-foreground">{clockTime(c.lastMessage.createdAt)}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      {c.lastMessage ? (c.lastMessage.type === 'text' ? c.lastMessage.content : `[${c.lastMessage.type}]`) : 'Say hi 👋'}
                    </p>
                    {c.unread > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between px-4">
            <SectionTitle className="flex items-center gap-1"><Sparkles size={12} /> People you may know</SectionTitle>
          </div>
          <div className="mt-2 space-y-1 px-2">
            {suggestions.map((s) => {
              const high = s.mutualFriends >= 3
              return (
                <Card
                  key={s.id}
                  className={cn(
                    'flex items-center gap-3 border-0 bg-card p-2 shadow-none transition hover:bg-accent/40',
                    high && 'bg-primary/5 ring-1 ring-primary/20'
                  )}
                >
                  <button onClick={() => openProfile(s.id)} className="flex flex-1 items-center gap-3 text-left">
                    <UserAvatar name={s.name} src={s.photoUrl} size={42} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{s.name}</span>
                        {high && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            <Sparkles size={10} /> Top
                          </span>
                        )}
                      </div>
                      {s.mutualFriends > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users size={11} />
                          {s.mutualFriends} mutual friend{s.mutualFriends === 1 ? '' : 's'}
                        </div>
                      ) : (
                        <div className="truncate text-xs text-muted-foreground">Suggested for you</div>
                      )}
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    disabled={sendingId === s.id}
                    onClick={() => sendRequest(s.id)}
                  >
                    <UserPlus size={14} className="mr-1" /> Add
                  </Button>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      <div className="mt-8 px-4">
        <button onClick={() => setView('calls')} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:bg-accent/40">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Phone size={18} /></div>
          <div className="text-left"><div className="text-sm font-semibold">Call history</div><div className="text-xs text-muted-foreground">Recent voice & video calls</div></div>
          <ChevronRight size={18} className="ml-auto text-muted-foreground" />
        </button>
      </div>
    </div>
  )

  async function sendRequest(id: string) {
    setSendingId(id)
    try {
      await api('/api/friends', { method: 'POST', body: JSON.stringify({ action: 'request', targetId: id }) })
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      const { toast } = await import('sonner')
      toast.success('Friend request sent')
    } catch (e: any) {
      const { toast } = await import('sonner')
      toast.error(e.message || 'Failed')
    } finally {
      setSendingId(null)
    }
  }
}
