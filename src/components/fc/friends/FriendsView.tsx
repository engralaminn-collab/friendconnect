'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, timeAgo } from '@/lib/api'
import { useApp } from '@/lib/store'
import { useSocket } from '@/hooks/use-socket'
import { UserAvatar, EmptyState, SectionTitle } from '@/components/fc/ui'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Search, UserPlus, Check, X, MessageCircle, Phone, Video, Ban, UserMinus, Clock, Users, ShieldOff, MapPin, Sparkles, Loader2, Star, StarOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UserLite { id: string; username: string; name: string; photoUrl: string | null; relation: string }
interface Friend { id: string; username: string; name: string; photoUrl: string | null; since: string; lastSeen: string | null; isCloseFriend?: boolean }
interface Req { id: string; username: string; name: string; photoUrl: string | null; createdAt: string }
interface Blocked { id: string; username: string; name: string; photoUrl: string | null; blockedAt: string }
interface Suggestion { id: string; username: string; name: string; photoUrl: string | null; bio: string | null; location: string | null; mutualFriends: number }

export function FriendsView() {
  const [tab, setTab] = useState('friends')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserLite[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<Req[]>([])
  const [outgoing, setOutgoing] = useState<Req[]>([])
  const [blocked, setBlocked] = useState<Blocked[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const { openChat, openProfile } = useApp()
  const { isOnline } = useSocket()
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const loadFriends = useCallback(async () => {
    const [f, r, b, c] = await Promise.all([
      api<{ friends: Friend[] }>('/api/friends'),
      api<{ incoming: Req[]; outgoing: Req[] }>('/api/friends/requests'),
      api<{ blocked: Blocked[] }>('/api/friends/blocked'),
      api<{ closeFriends: { id: string }[] }>('/api/friends/close').catch(() => ({ closeFriends: [] as { id: string }[] })),
    ])
    const closeIds = new Set(c.closeFriends.map((cf) => cf.id))
    setFriends(f.friends.map((fr) => ({ ...fr, isCloseFriend: closeIds.has(fr.id) })))
    setIncoming(r.incoming)
    setOutgoing(r.outgoing)
    setBlocked(b.blocked)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    try {
      const data = await api<{ users: UserLite[] }>(`/api/users/search?q=${encodeURIComponent(q)}`)
      setResults(data.users)
    } catch {}
  }, [])

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    try {
      const data = await api<{ suggestions: Suggestion[] }>('/api/friends/suggestions')
      setSuggestions(data.suggestions)
    } catch {
      // ignore
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  const addSuggestion = useCallback(async (id: string) => {
    setActionLoading((s) => ({ ...s, [id + 'request']: true }))
    try {
      await api('/api/friends', { method: 'POST', body: JSON.stringify({ action: 'request', targetId: id }) })
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      toast.success('Friend request sent')
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setActionLoading((s) => ({ ...s, [id + 'request']: false }))
    }
  }, [])

  useEffect(() => {
    loadFriends()
    runSearch(query)
  }, [loadFriends, runSearch, query])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  useEffect(() => {
    if (tab === 'suggested') {
      loadSuggestions()
    }
  }, [tab, loadSuggestions])

  const doAction = async (targetId: string, action: string, msg?: string) => {
    setActionLoading((s) => ({ ...s, [targetId + action]: true }))
    try {
      await api('/api/friends', { method: 'POST', body: JSON.stringify({ action, targetId }) })
      if (msg) toast.success(msg)
      await loadFriends()
      await runSearch(query)
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setActionLoading((s) => ({ ...s, [targetId + action]: false }))
    }
  }

  const toggleCloseFriend = async (targetId: string, current: boolean) => {
    setActionLoading((s) => ({ ...s, [targetId + 'closeFriend']: true }))
    try {
      await api('/api/friends/close', {
        method: 'POST',
        body: JSON.stringify({ targetId, action: 'closeFriend', value: !current }),
      })
      toast.success(!current ? 'Added to close friends' : 'Removed from close friends')
      await loadFriends()
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally {
      setActionLoading((s) => ({ ...s, [targetId + 'closeFriend']: false }))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h1 className="mb-3 text-xl font-bold">Friends</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Exact email or username (e.g. you@friend.com)" className="rounded-xl pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid grid-cols-5 rounded-xl">
          <TabsTrigger value="friends" className="text-xs">Friends</TabsTrigger>
          <TabsTrigger value="requests" className="text-xs">Requests{incoming.length > 0 && <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{incoming.length}</span>}</TabsTrigger>
          <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
          <TabsTrigger value="suggested" className="text-xs">Suggested</TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs">Blocked</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="fc-scroll m-0 flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <EmptyState
              icon={<Search size={36} />}
              title="Nobody to show"
              description="FriendConnect has no member directory. Enter someone's exact email address or @username to send them a connection request — until they accept, you both stay invisible to each other."
            />
          ) : (
            <div className="space-y-1">
              {results.map((u) => {
                const rel = u.relation
                return (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/40">
                    <button onClick={() => openProfile(u.id)} className="flex flex-1 items-center gap-3 text-left">
                      <UserAvatar name={u.name} src={u.photoUrl} size={44} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{u.name}</div>
                        <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                      </div>
                    </button>
                    {rel === 'NONE' && <Button size="sm" variant="secondary" className="rounded-full" disabled={actionLoading[u.id + 'request']} onClick={() => doAction(u.id, 'request', 'Request sent')}><UserPlus size={14} className="mr-1" />Add</Button>}
                    {rel === 'PENDING' && <span className="text-xs text-muted-foreground">Pending</span>}
                    {rel === 'ACCEPTED' && <Button size="sm" variant="ghost" className="rounded-full" onClick={() => openChat(u.id)}><MessageCircle size={14} className="mr-1" />Chat</Button>}
                    {rel.startsWith('BLOCKED') && <span className="text-xs text-muted-foreground">Blocked</span>}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends" className="fc-scroll m-0 flex-1 overflow-y-auto p-4">
          {friends.length === 0 ? (
            <EmptyState icon={<Users size={36} />} title="No friends yet" description="Find people you know and send a request." />
          ) : (
            <div className="space-y-1">
              {friends.map((f) => (
                <FriendRow
                  key={f.id}
                  friend={f}
                  online={isOnline(f.id)}
                  onChat={() => openChat(f.id)}
                  onProfile={() => openProfile(f.id)}
                  onRemove={() => doAction(f.id, 'remove', 'Friend removed')}
                  onBlock={() => doAction(f.id, 'block', 'User blocked')}
                  onToggleClose={() => toggleCloseFriend(f.id, !!f.isCloseFriend)}
                  loadingRemove={actionLoading[f.id + 'remove']}
                  loadingClose={actionLoading[f.id + 'closeFriend']}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="fc-scroll m-0 flex-1 overflow-y-auto p-4">
          {incoming.length === 0 && outgoing.length === 0 ? (
            <EmptyState icon={<Clock size={36} />} title="No pending requests" description="Friend requests will appear here." />
          ) : (
            <div className="space-y-4">
              {incoming.length > 0 && (
                <div>
                  <SectionTitle className="mb-2">Incoming ({incoming.length})</SectionTitle>
                  <div className="space-y-1">
                    {incoming.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/40">
                        <button onClick={() => openProfile(r.id)} className="flex flex-1 items-center gap-3 text-left">
                          <UserAvatar name={r.name} src={r.photoUrl} size={44} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{r.name}</div>
                            <div className="text-xs text-muted-foreground">wants to connect · {timeAgo(r.createdAt)} ago</div>
                          </div>
                        </button>
                        <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={actionLoading[r.id + 'accept']} onClick={() => doAction(r.id, 'accept', 'Friend added')}><Check size={16} /></Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" disabled={actionLoading[r.id + 'reject']} onClick={() => doAction(r.id, 'reject', 'Request declined')}><X size={16} /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {outgoing.length > 0 && (
                <div>
                  <SectionTitle className="mb-2">Outgoing ({outgoing.length})</SectionTitle>
                  <div className="space-y-1">
                    {outgoing.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/40">
                        <button onClick={() => openProfile(r.id)} className="flex flex-1 items-center gap-3 text-left">
                          <UserAvatar name={r.name} src={r.photoUrl} size={44} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{r.name}</div>
                            <div className="text-xs text-muted-foreground">waiting · {timeAgo(r.createdAt)} ago</div>
                          </div>
                        </button>
                        <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" disabled={actionLoading[r.id + 'reject']} onClick={() => doAction(r.id, 'reject', 'Request cancelled')}>Cancel</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blocked" className="fc-scroll m-0 flex-1 overflow-y-auto p-4">
          {blocked.length === 0 ? (
            <EmptyState icon={<ShieldOff size={36} />} title="No blocked users" description="Blocked users will appear here." />
          ) : (
            <div className="space-y-1">
              {blocked.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent/40">
                  <UserAvatar name={b.name} src={b.photoUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{b.name}</div>
                    <div className="text-xs text-muted-foreground">blocked {timeAgo(b.blockedAt)} ago</div>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-full" disabled={actionLoading[b.id + 'unblock']} onClick={() => doAction(b.id, 'unblock', 'User unblocked')}>Unblock</Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggested" className="fc-scroll m-0 flex-1 overflow-y-auto p-4">
          {suggestionsLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SuggestionSkeleton key={i} />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <EmptyState
              icon={<Users size={36} />}
              title="No suggestions yet"
              description="People only appear here after they send you a connection request. Nothing is suggested from the wider network — that keeps everyone private."
            />
          ) : (
            <div className="space-y-1">
              {suggestions.map((s) => (
                <SuggestionRow key={s.id} suggestion={s} onAdd={() => addSuggestion(s.id)} loading={!!actionLoading[s.id + 'request']} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FriendRow({ friend, online, onChat, onProfile, onRemove, onBlock, onToggleClose, loadingRemove, loadingClose }: { friend: Friend; online: boolean; onChat: () => void; onProfile: () => void; onRemove: () => void; onBlock: () => void; onToggleClose: () => void; loadingRemove: boolean; loadingClose: boolean }) {
  const [menu, setMenu] = useState(false)
  const isClose = !!friend.isCloseFriend
  return (
    <div className="group relative flex items-center gap-3 rounded-xl p-2 hover:bg-accent/40">
      <button onClick={onProfile} className="flex flex-1 items-center gap-3 text-left">
        <UserAvatar name={friend.name} src={friend.photoUrl} size={44} online={online} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{friend.name}</span>
            {isClose && (
              <span title="Close friend" aria-label="Close friend" className="inline-flex shrink-0 items-center">
                <Star size={11} className="fill-primary text-primary" />
              </span>
            )}
          </div>
          <div className={cn('text-xs', online ? 'text-primary' : 'text-muted-foreground')}>{online ? 'online' : `last seen ${timeAgo(friend.lastSeen)} ago`}</div>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <button onClick={onChat} className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/25" title="Message"><MessageCircle size={16} /></button>
        <button onClick={() => setMenu((m) => !m)} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
        </button>
      </div>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-2 top-12 z-20 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg">
            <button onClick={() => { onProfile(); setMenu(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"><UserPlus size={14} />View profile</button>
            <button onClick={() => { onToggleClose(); setMenu(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent" disabled={loadingClose}>
              {isClose ? <StarOff size={14} /> : <Star size={14} />}
              {isClose ? 'Remove from close' : 'Add to close friends'}
            </button>
            <button onClick={() => { onBlock(); setMenu(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent"><Ban size={14} />Block</button>
            <button onClick={() => { onRemove(); setMenu(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent" disabled={loadingRemove}><UserMinus size={14} />Remove</button>
          </div>
        </>
      )}
    </div>
  )
}

function SuggestionRow({ suggestion, onAdd, loading }: { suggestion: Suggestion; onAdd: () => void; loading: boolean }) {
  const { openProfile } = useApp()
  const high = suggestion.mutualFriends >= 3
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl p-2 transition hover:bg-accent/40',
        high && 'bg-primary/5 ring-1 ring-primary/20'
      )}
    >
      <button onClick={() => openProfile(suggestion.id)} className="flex flex-1 items-start gap-3 text-left">
        <UserAvatar name={suggestion.name} src={suggestion.photoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{suggestion.name}</span>
            {high && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Sparkles size={10} /> Top
              </span>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">@{suggestion.username}</div>
          {suggestion.mutualFriends > 0 ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={11} />
              {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends === 1 ? '' : 's'}
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-muted-foreground">Suggested for you</div>
          )}
          {suggestion.bio && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{suggestion.bio}</p>
          )}
          {suggestion.location && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={11} />
              {suggestion.location}
            </div>
          )}
        </div>
      </button>
      <Button size="sm" variant="secondary" className="shrink-0 rounded-full" disabled={loading} onClick={onAdd}>
        {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <UserPlus size={14} className="mr-1" />}
        Connect
      </Button>
    </div>
  )
}

function SuggestionSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl p-2">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5 pt-1">
        <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-muted" />
    </div>
  )
}
