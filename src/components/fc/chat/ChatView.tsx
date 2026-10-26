'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/store'
import { useAuth } from '@/hooks/use-auth'
import { useSocket } from '@/hooks/use-socket'
import { RT } from '@/lib/constants'
import { api, uploadFile, clockTime, timeAgo, lastSeenText } from '@/lib/api'
import { UserAvatar, EmptyState, SectionTitle } from '@/components/fc/ui'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Clock,
  FileText,
  FileJson,
  Download,
  Maximize2,
  Search,
  Users,
  MessageCircle,
  Loader2,
  Pin,
  Bell,
  BellRing,
  BellOff,
  Mic,
  X,
  Trash2,
  Heart,
  Forward,
  Copy,
  Reply,
  Star,
  MoreVertical,
  Timer,
  Archive,
  ArchiveRestore,
  Pencil,
  ChevronDown,
  ChevronRight,
  PinOff,
  MessageSquare,
  Camera,
  Image as ImageIcon,
  CornerUpLeft,
  Calendar,
  Folder,
  FolderOpen,
  Move,
} from 'lucide-react'

// ---------------- types ----------------
type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document'
type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'SEEN'

interface Reaction {
  emoji: string
  userId: string
  userName: string
}

interface Conversation {
  id: string
  username: string
  name: string
  photoUrl: string | null
  unread: number
  pinned?: boolean
  muted?: boolean
  archived?: boolean
  // Round 10: chat folder name (null = "All" / no folder). Backend stores
  // this on ChatPreference.folder and returns it on GET /api/messages/conversations.
  folder?: string | null
  lastMessage: {
    content: string
    type: string
    senderId: string
    createdAt: string
    status: string
  } | null
}

interface GroupLite {
  id: string
  name: string
  description: string | null
  photoUrl: string | null
  role: string
  memberCount: number
  createdAt: string
}

interface Message {
  id: string
  tempId?: string
  senderId: string
  senderName?: string | null
  senderPhoto?: string | null
  receiverId?: string | null
  groupId?: string | null
  content: string
  type: MessageType
  fileUrl?: string | null
  fileName?: string | null
  fileSize?: number | null
  mimeType?: string | null
  status?: MessageStatus
  createdAt: string
  reactions?: Reaction[]
  deletedFor?: string
  forwardedFrom?: string | null
  starred?: boolean
  expiresAt?: string | null
  edited?: boolean
  editedAt?: string | null
  // Round 6: per-user message pin within a 1:1 chat. Holds the userId that
  // pinned this message (me.id when pinned by me, otherwise null). Only one
  // pinned message per 1:1 conversation is allowed by the backend.
  pinnedBy?: string | null
  // Round 7: id of the message this message is replying to (null when not a
  // reply). Returned by GET /api/messages + the message:new / group:message:new
  // socket events + sent in the message:send / group:message:send payloads.
  replyToId?: string | null
}

interface Friend {
  id: string
  username: string
  name: string
  photoUrl: string | null
  lastSeen: string | null
}

interface PeerInfo {
  name: string
  photoUrl: string | null
  username?: string
  lastSeen?: string | null
  memberCount?: number
}

// Round 6: global message search result shape returned by
// GET /api/messages/search?q=QUERY. Each result carries the conversation
// context (peerId/peerName for direct, groupId/groupName for group) so the
// UI can route the tap to the right chat.
interface GlobalSearchResult {
  messageId: string
  content: string
  type: string
  createdAt: string
  senderId: string
  senderName: string
  conversationType: 'direct' | 'group'
  peerId?: string
  peerName?: string
  peerUsername?: string
  peerPhoto?: string | null
  groupId?: string
  groupName?: string
}

// Round 10: message reminder shape returned by GET /api/messages/reminders.
// Each reminder carries the originating message content + the peer context so
// the RemindersDialog can render a row without an extra fetch. `messageId` is
// used as the DELETE URL param (DELETE /api/messages/[messageId]/remind).
interface MessageReminderLite {
  id: string
  messageId: string
  content: string
  type: string
  remindAt: string
  peerId: string | null
  peerName: string
}

const EMOJIS = [
  '😀', '😄', '😁', '😂', '🥹', '😊', '😍', '😘',
  '😎', '🤔', '😴', '😭', '😡', '🥳', '😇', '🙃',
  '👍', '👎', '🙏', '👏', '🙌', '🤝', '👋', '✌️',
  '🤞', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🔥', '✨', '🎉', '🎁', '💯', '⭐', '🌟', '☀️',
  '🌙', '🌈', '☕', '🍕', '🍔', '🍟', '🍦', '🍓',
  '🌸', '🌺', '🐶', '🐱', '🦄', '🐢', '🦋', '🐝',
  '⚽', '🏀', '🎵', '🎮', '📱', '💻', '📚', '✅',
  '❌', '❓', '❗', '🚀', '👀', '🫶', '🤗', '🫡',
]

// ---------------- helpers ----------------
function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return ''
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

function fileTypeFromMime(mime: string | null | undefined): MessageType {
  if (!mime) return 'document'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

// Detect PDF documents by mimeType or .pdf file extension — used to decide
// whether to render an inline <iframe> preview vs. the simple download card.
function isPdfMessage(msg: Message): boolean {
  if (msg.mimeType && msg.mimeType.toLowerCase() === 'application/pdf') return true
  if (msg.fileName && msg.fileName.toLowerCase().endsWith('.pdf')) return true
  return false
}

function linkify(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer" className="underline break-all">
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function toISO(d: any): string {
  if (!d) return new Date().toISOString()
  if (typeof d === 'string') return d
  if (d instanceof Date) return d.toISOString()
  try {
    return new Date(d).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function newTempId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Round 8: format an ISO date for the scheduled-messages viewer/list,
// e.g. "Jan 5, 3:42 PM". Used by the toast + the ScheduledMessagesDialog rows.
function formatScheduledTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Round 8: convert a Date to the YYYY-MM-DDTHH:MM format required by
// <input type="datetime-local">. The value is in the user's local timezone
// (the browser interprets datetime-local values as local time, not UTC).
function toLocalDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function normalizeMessage(raw: any): Message {
  return {
    id: raw.id,
    senderId: raw.senderId,
    senderName: raw.senderName ?? raw.sender?.name ?? null,
    senderPhoto: raw.senderPhoto ?? raw.sender?.profile?.photoUrl ?? null,
    receiverId: raw.receiverId ?? null,
    groupId: raw.groupId ?? null,
    content: raw.content ?? '',
    type: (raw.type ?? 'text') as MessageType,
    fileUrl: raw.fileUrl ?? null,
    fileName: raw.fileName ?? null,
    fileSize: raw.fileSize ?? null,
    mimeType: raw.mimeType ?? null,
    status: (raw.status ?? 'SENT') as MessageStatus,
    createdAt: toISO(raw.createdAt),
    reactions: Array.isArray(raw.reactions) ? raw.reactions.map((r: any) => ({ emoji: r.emoji, userId: r.userId, userName: r.userName })) : [],
    deletedFor: raw.deletedFor ?? '',
    forwardedFrom: raw.forwardedFrom ?? null,
    starred: !!raw.starred,
    expiresAt: raw.expiresAt ?? null,
    edited: !!raw.edited,
    editedAt: raw.editedAt ?? null,
    pinnedBy: raw.pinnedBy ?? null,
    replyToId: raw.replyToId ?? null,
  }
}

// A message is rendered as the "🚫 This message was deleted" placeholder when
// it was deleted for everyone OR explicitly deleted-for-me (deletedFor is a
// comma-separated list of user ids, or the literal 'everyone').
function isDeletedForMe(msg: Message, meId?: string): boolean {
  if (!msg.deletedFor) return false
  if (msg.deletedFor === 'everyone') return true
  if (!meId) return false
  return msg.deletedFor
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(meId)
}

function lastMessagePreview(c: Conversation, meId: string | undefined): string {
  if (!c.lastMessage) return 'Tap to start chatting'
  const lm = c.lastMessage
  const prefix = meId && lm.senderId === meId ? 'You: ' : ''
  if (lm.type === 'image') return `${prefix}📷 Photo`
  if (lm.type === 'video') return `${prefix}🎥 Video`
  if (lm.type === 'audio') return `${prefix}🎤 Audio`
  if (lm.type === 'document') return `${prefix}📄 Document`
  return `${prefix}${lm.content}`
}

// ---------------- main entry ----------------
export function ChatView() {
  const activeChatUserId = useApp((s) => s.activeChatUserId)
  const activeChatGroupId = useApp((s) => s.activeChatGroupId)
  const back = useCallback(() => {
    useApp.setState({ activeChatUserId: null, activeChatGroupId: null })
  }, [])

  if (activeChatUserId) {
    return <ChatRoom mode="direct" peerId={activeChatUserId} onBack={back} />
  }
  if (activeChatGroupId) {
    return <ChatRoom mode="group" peerId={activeChatGroupId} onBack={back} />
  }
  return <ConversationList />
}

// ---------------- conversation list ----------------
function ConversationList() {
  const [tab, setTab] = useState<'chats' | 'groups'>('chats')
  const [query, setQuery] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [archivedConvs, setArchivedConvs] = useState<Conversation[]>([])
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map())
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const [groups, setGroups] = useState<GroupLite[]>([])
  const [loading, setLoading] = useState(true)
  // Round 6: global message search state — fires debounced (400ms) when the
  // search box has text. Results render in the search dropdown alongside the
  // local conversation filter.
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)
  const globalSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Round 7: typing-status in conversation list. Tracks which conversations
  // currently have someone typing (peerId for 1:1, `group:${groupId}` for
  // groups). Each entry has a 3s auto-expiry timer so a missed isTyping:false
  // doesn't leave a stale "typing…" indicator forever.
  const [typingConvs, setTypingConvs] = useState<Set<string>>(new Set())
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // Round 10: chat folders. `collapsedFolders` holds the set of folder keys
  // (folder name string, or "All" for the no-folder section) that are
  // currently collapsed. Empty set = all expanded. `moveTarget` is the
  // conversation currently being moved via the MoveToFolderDialog (null when
  // the dialog is closed).
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [moveTarget, setMoveTarget] = useState<Conversation | null>(null)
  const { openChat, openGroupChat } = useApp()
  const { socket, isOnline } = useSocket()
  const { user: me } = useAuth()
  const meId = me?.id

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, g, d] = await Promise.all([
        api<{ conversations: Conversation[]; archived: Conversation[] }>(
          '/api/messages/conversations'
        ).catch(() => ({ conversations: [] as Conversation[], archived: [] as Conversation[] })),
        api<{ groups: GroupLite[] }>('/api/groups').catch(() => ({ groups: [] as GroupLite[] })),
        api<{ drafts: Array<{ peerId: string; isGroup: boolean; content: string; updatedAt: string }> }>(
          '/api/messages/drafts'
        ).catch(() => ({ drafts: [] as Array<{ peerId: string; isGroup: boolean; content: string; updatedAt: string }> })),
      ])
      setConversations(c.conversations)
      setArchivedConvs(c.archived)
      setGroups(g.groups)
      const draftMap = new Map<string, string>()
      for (const draft of d.drafts) {
        if (draft.content) draftMap.set(draft.peerId, draft.content)
      }
      setDrafts(draftMap)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // realtime: refresh lastMessage + unread when a new message arrives
  useEffect(() => {
    if (!socket || !meId) return
    const onNew = (raw: any) => {
      if (!raw || raw.groupId) return
      const peerId = raw.senderId === meId ? raw.receiverId : raw.senderId
      if (!peerId) return
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === peerId)
        const lm = {
          content: raw.content || '',
          type: raw.type || 'text',
          senderId: raw.senderId,
          createdAt: toISO(raw.createdAt),
          status: raw.status || 'SENT',
        }
        const unreadInc = raw.receiverId === meId ? 1 : 0
        if (exists) {
          const updated: Conversation = {
            ...exists,
            lastMessage: lm,
            unread: exists.unread + unreadInc,
          }
          return [updated, ...prev.filter((c) => c.id !== peerId)]
        }
        // unknown peer — refetch to populate name/photo
        load()
        return prev
      })
    }
    const onStatus = ({ id, status }: { id: string; status: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.lastMessage && c.lastMessage.senderId === meId && c.lastMessage.status !== status
            ? { ...c, lastMessage: { ...c.lastMessage, status } }
            : c
        )
      )
    }
    const onGroupNew = (raw: any) => {
      if (!raw?.groupId) return
      // bump group to top by re-fetching once (lightweight)
      load()
    }
    socket.on(RT.MESSAGE_NEW, onNew)
    socket.on(RT.MESSAGE_STATUS, onStatus as any)
    socket.on(RT.GROUP_MESSAGE_NEW, onGroupNew as any)
    return () => {
      socket.off(RT.MESSAGE_NEW, onNew)
      socket.off(RT.MESSAGE_STATUS, onStatus as any)
      socket.off(RT.GROUP_MESSAGE_NEW, onGroupNew as any)
    }
  }, [socket, meId, load])

  // Round 7: typing-status in conversation list. Subscribe to both
  // typing:indicator (1:1 — keyed by userId) and group:typing:indicator
  // (keyed by `group:${groupId}`). Each "isTyping:true" event schedules a
  // 3s auto-expiry timer so a missed isTyping:false (e.g. the peer's socket
  // disconnected mid-typing) doesn't leave a stale "typing…" forever.
  // Filters out the user's own id (the server already excludes the typer
  // for group events; for 1:1 the typing:indicator is emitted to the
  // receiver only, but the check is harmless + defensive).
  useEffect(() => {
    if (!socket || !meId) return

    const clearTyping = (key: string) => {
      setTypingConvs((prev) => {
        if (!prev.has(key)) return prev
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }

    const scheduleExpiry = (key: string) => {
      const timers = typingTimersRef.current
      const existing = timers.get(key)
      if (existing) clearTimeout(existing)
      const t = setTimeout(() => {
        timers.delete(key)
        clearTyping(key)
      }, 3000)
      timers.set(key, t)
    }

    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (!userId || userId === meId) return
      if (isTyping) {
        setTypingConvs((prev) => {
          if (prev.has(userId)) return prev
          const next = new Set(prev)
          next.add(userId)
          return next
        })
        scheduleExpiry(userId)
      } else {
        const t = typingTimersRef.current.get(userId)
        if (t) {
          clearTimeout(t)
          typingTimersRef.current.delete(userId)
        }
        clearTyping(userId)
      }
    }

    const onGroupTyping = ({
      groupId,
      userId,
      isTyping,
    }: {
      groupId: string
      userId: string
      isTyping: boolean
    }) => {
      if (!groupId || userId === meId) return
      const key = `group:${groupId}`
      if (isTyping) {
        setTypingConvs((prev) => {
          if (prev.has(key)) return prev
          const next = new Set(prev)
          next.add(key)
          return next
        })
        scheduleExpiry(key)
      } else {
        const t = typingTimersRef.current.get(key)
        if (t) {
          clearTimeout(t)
          typingTimersRef.current.delete(key)
        }
        clearTyping(key)
      }
    }

    socket.on(RT.TYPING_INDICATOR, onTyping)
    socket.on(RT.GROUP_TYPING_INDICATOR, onGroupTyping)
    return () => {
      socket.off(RT.TYPING_INDICATOR, onTyping)
      socket.off(RT.GROUP_TYPING_INDICATOR, onGroupTyping)
      typingTimersRef.current.forEach((t) => clearTimeout(t))
      typingTimersRef.current.clear()
    }
  }, [socket, meId])

  // Round 6: global message search — debounced 400ms after the user stops
  // typing. Fires GET /api/messages/search?q=QUERY and renders the results in
  // the search dropdown alongside the local conversation filter. The effect
  // cleanup clears the timer on every query change so only the latest query
  // triggers a request. Empty query → empty results (no API call).
  useEffect(() => {
    const qq = query.trim()
    if (!qq) {
      setGlobalResults([])
      setGlobalLoading(false)
      return
    }
    setGlobalLoading(true)
    if (globalSearchTimerRef.current) {
      clearTimeout(globalSearchTimerRef.current)
      globalSearchTimerRef.current = null
    }
    globalSearchTimerRef.current = setTimeout(async () => {
      try {
        const d = await api<{ results: GlobalSearchResult[] }>(
          `/api/messages/search?q=${encodeURIComponent(qq)}`
        )
        setGlobalResults(d.results || [])
      } catch {
        setGlobalResults([])
      } finally {
        setGlobalLoading(false)
      }
    }, 400)
    return () => {
      if (globalSearchTimerRef.current) {
        clearTimeout(globalSearchTimerRef.current)
        globalSearchTimerRef.current = null
      }
    }
  }, [query])

  const q = query.trim().toLowerCase()
  const filteredConvs = q
    ? conversations.filter((c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q))
    : conversations
  const filteredArchived = q
    ? archivedConvs.filter((c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q))
    : archivedConvs
  const filteredGroups = q
    ? groups.filter((g) => g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q))
    : groups

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0)

  // ---- archive / unarchive a conversation (optimistic + API + toast) ----
  const handleToggleArchive = useCallback(
    async (c: Conversation, currentlyArchived: boolean) => {
      const nextArchived = !currentlyArchived
      // Optimistic move between active/archived arrays
      if (nextArchived) {
        setConversations((prev) => prev.filter((x) => x.id !== c.id))
        setArchivedConvs((prev) => [{ ...c, archived: true }, ...prev])
      } else {
        setArchivedConvs((prev) => prev.filter((x) => x.id !== c.id))
        setConversations((prev) => [...prev, { ...c, archived: false }])
      }
      try {
        await api('/api/messages/preferences', {
          method: 'POST',
          body: JSON.stringify({ peerId: c.id, archived: nextArchived }),
        })
        toast.success(nextArchived ? 'Chat archived' : 'Chat unarchived')
      } catch (e: any) {
        toast.error(e?.message || 'Failed to update archive')
        load()
      }
    },
    [load]
  )

  // ---- Round 10: chat folders ----
  // Collect every distinct folder name across active + archived conversations
  // so the MoveToFolderDialog can offer them as quick-pick chips. Sorted
  // alphabetically for a stable, predictable order.
  const existingFolders = useMemo(() => {
    const set = new Set<string>()
    for (const c of conversations) {
      if (c.folder) set.add(c.folder)
    }
    for (const c of archivedConvs) {
      if (c.folder) set.add(c.folder)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [conversations, archivedConvs])

  // Group the filtered (search-matched) conversations by folder. "All" is
  // the synthetic key for conversations without a folder; it always sorts
  // first. Folders (when present) follow alphabetically. Within each group
  // the API's pinned-first + lastMessage-time ordering is preserved.
  const groupedConvs = useMemo(() => {
    const groups = new Map<string, Conversation[]>()
    for (const c of filteredConvs) {
      const key = c.folder || 'All'
      const arr = groups.get(key)
      if (arr) arr.push(c)
      else groups.set(key, [c])
    }
    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'All') return -1
      if (b === 'All') return 1
      return a.localeCompare(b)
    })
    return keys.map((k) => ({ folder: k, items: groups.get(k)! }))
  }, [filteredConvs])

  // Whether folder section headers should render at all. We only show the
  // grouping UI when the user has at least one folder defined — otherwise
  // the list looks exactly like before (no superfluous "All" header).
  const hasFolders = existingFolders.length > 0

  const toggleFolder = useCallback((key: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // POST /api/messages/preferences { peerId, folder } — empty string clears
  // the folder (moves back to "All"). Optimistically update local state for
  // both active and archived arrays, then refetch to confirm.
  const handleMoveToFolder = useCallback(
    async (peerId: string, folder: string) => {
      const nextFolder = folder && folder !== 'All' ? folder : ''
      // Optimistic update across both arrays.
      setConversations((prev) =>
        prev.map((c) => (c.id === peerId ? { ...c, folder: nextFolder || null } : c))
      )
      setArchivedConvs((prev) =>
        prev.map((c) => (c.id === peerId ? { ...c, folder: nextFolder || null } : c))
      )
      setMoveTarget(null)
      try {
        await api('/api/messages/preferences', {
          method: 'POST',
          body: JSON.stringify({ peerId, folder: nextFolder }),
        })
        toast.success(nextFolder ? `Moved to "${nextFolder}"` : 'Removed from folder')
      } catch (e: any) {
        toast.error(e?.message || 'Failed to move chat')
        load()
      }
    },
    [load]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Chats</h1>
          {totalUnread > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {totalUnread} unread
            </span>
          )}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages"
            className="rounded-xl pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Round 6: when the search box has text, replace the chat/group tabs
          with a unified search dropdown that shows TWO sections — the local
          conversation filter (chats + groups whose name matches) AND global
          message search results (GET /api/messages/search?q=...). Each result
          row is tappable and routes the user into the right conversation. */}
      {query.trim() ? (
        <div className="fc-scroll flex-1 overflow-y-auto p-2">
          {/* Conversations section */}
          {(filteredConvs.length > 0 || filteredGroups.length > 0) && (
            <div className="mb-2">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Conversations
              </div>
              {filteredConvs.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    openChat(c.id)
                    setQuery('')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-accent/40"
                >
                  <UserAvatar name={c.name} src={c.photoUrl} size={40} online={isOnline(c.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">@{c.username}</div>
                  </div>
                </button>
              ))}
              {filteredGroups.slice(0, 5).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    openGroupChat(g.id)
                    setQuery('')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-accent/40"
                >
                  {g.photoUrl ? (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                      <img src={g.photoUrl} alt={g.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-border">
                      <Users size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{g.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Messages section (global search) */}
          <div>
            <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare size={11} />
              Messages
            </div>
            {globalLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-muted-foreground" size={16} />
              </div>
            ) : globalResults.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                No messages found
              </div>
            ) : (
              globalResults.map((r) => (
                <button
                  key={r.messageId}
                  type="button"
                  onClick={() => {
                    if (r.conversationType === 'direct' && r.peerId) {
                      openChat(r.peerId)
                    } else if (r.conversationType === 'group' && r.groupId) {
                      openGroupChat(r.groupId)
                    }
                    setQuery('')
                  }}
                  className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition hover:bg-accent/40"
                >
                  <MessageSquare size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm">
                      {highlight(r.content || '', query.trim())}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">{r.senderName || 'Unknown'}</span>
                      <span className="shrink-0">·</span>
                      <span className="truncate">
                        {r.conversationType === 'direct' ? r.peerName || 'Direct' : r.groupName || 'Group'}
                      </span>
                      <span className="shrink-0">·</span>
                      <span className="shrink-0">{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Empty state when nothing matches at all */}
          {!loading &&
            filteredConvs.length === 0 &&
            filteredGroups.length === 0 &&
            !globalLoading &&
            globalResults.length === 0 && (
              <div className="py-8">
                <EmptyState
                  icon={<Search size={36} />}
                  title="No results"
                  description={`Nothing matches "${query.trim()}" in your chats or messages.`}
                />
              </div>
            )}
        </div>
      ) : (
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'chats' | 'groups')} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-3 grid grid-cols-2 rounded-xl">
          <TabsTrigger value="chats" className="text-xs">
            Chats
            {totalUnread > 0 && (
              <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-xs">
            Groups
            {groups.length > 0 && (
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">{groups.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="fc-scroll m-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <ConvRowSkeleton key={i} />
              ))}
            </div>
          ) : filteredConvs.length === 0 && filteredArchived.length === 0 ? (
            <EmptyState
              icon={<MessageCircle size={36} />}
              title={q ? 'No matching chats' : 'No conversations yet'}
              description={q ? 'Try a different search.' : 'Add a friend and say hello to start chatting.'}
            />
          ) : (
            <div className="space-y-0.5">
              {hasFolders
                ? // Round 10: folder-grouped view — render a collapsible section
                  // per folder (with "All" for unfiled convs always first).
                  groupedConvs.map((group) => {
                    const collapsed = collapsedFolders.has(group.folder)
                    const isAll = group.folder === 'All'
                    return (
                      <div key={group.folder} className="mt-1">
                        <button
                          type="button"
                          onClick={() => toggleFolder(group.folder)}
                          className="flex w-full items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/40 rounded-lg transition-colors"
                          aria-expanded={!collapsed}
                          aria-controls={`folder-${group.folder}-list`}
                        >
                          {isAll ? (
                            <MessageCircle size={14} className="shrink-0 text-muted-foreground" />
                          ) : collapsed ? (
                            <Folder size={14} className="shrink-0 text-muted-foreground" />
                          ) : (
                            <FolderOpen size={14} className="shrink-0 text-primary" />
                          )}
                          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                            {isAll ? 'All' : group.folder}
                          </span>
                          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-muted px-1 text-[9px] font-bold text-muted-foreground">
                            {group.items.length}
                          </span>
                          <ChevronDown
                            size={14}
                            className={cn(
                              'ml-auto text-muted-foreground transition-transform',
                              collapsed && '-rotate-90'
                            )}
                          />
                        </button>
                        {!collapsed && (
                          <div id={`folder-${group.folder}-list`} className="space-y-0.5">
                            {group.items.map((c) => (
                              <ConversationRow
                                key={c.id}
                                conversation={c}
                                online={isOnline(c.id)}
                                meId={meId}
                                draftPreview={drafts.get(c.id)}
                                isTyping={typingConvs.has(c.id)}
                                onOpen={() => openChat(c.id)}
                                onTogglePin={async () => {
                                  try {
                                    await api('/api/messages/preferences', { method: 'POST', body: JSON.stringify({ peerId: c.id, pinned: !c.pinned }) })
                                    setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, pinned: !x.pinned } : x)))
                                  } catch (e: any) { toast.error(e.message) }
                                }}
                                onToggleMute={async () => {
                                  try {
                                    await api('/api/messages/preferences', { method: 'POST', body: JSON.stringify({ peerId: c.id, muted: !c.muted }) })
                                    setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, muted: !x.muted } : x)))
                                  } catch (e: any) { toast.error(e.message) }
                                }}
                                onToggleArchive={() => handleToggleArchive(c, false)}
                                onMoveToFolder={() => setMoveTarget(c)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                : // No folders defined — flat list, exactly like before.
                  filteredConvs.map((c) => (
                    <ConversationRow
                      key={c.id}
                      conversation={c}
                      online={isOnline(c.id)}
                      meId={meId}
                      draftPreview={drafts.get(c.id)}
                      isTyping={typingConvs.has(c.id)}
                      onOpen={() => openChat(c.id)}
                      onTogglePin={async () => {
                        try {
                          await api('/api/messages/preferences', { method: 'POST', body: JSON.stringify({ peerId: c.id, pinned: !c.pinned }) })
                          setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, pinned: !x.pinned } : x)))
                        } catch (e: any) { toast.error(e.message) }
                      }}
                      onToggleMute={async () => {
                        try {
                          await api('/api/messages/preferences', { method: 'POST', body: JSON.stringify({ peerId: c.id, muted: !c.muted }) })
                          setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, muted: !x.muted } : x)))
                        } catch (e: any) { toast.error(e.message) }
                      }}
                      onToggleArchive={() => handleToggleArchive(c, false)}
                      onMoveToFolder={() => setMoveTarget(c)}
                    />
                  ))}

              {/* Archived section (collapsed by default) */}
              {filteredArchived.length > 0 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setArchivedExpanded((v) => !v)}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                    aria-expanded={archivedExpanded}
                    aria-controls="archived-chats-list"
                  >
                    {archivedExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Archived ({filteredArchived.length})
                  </button>
                  {archivedExpanded && (
                    <div id="archived-chats-list" className="space-y-0.5">
                      {filteredArchived.map((c) => (
                        <ConversationRow
                          key={c.id}
                          conversation={c}
                          online={isOnline(c.id)}
                          meId={meId}
                          draftPreview={drafts.get(c.id)}
                          isTyping={typingConvs.has(c.id)}
                          archived
                          onOpen={() => openChat(c.id)}
                          onTogglePin={async () => {
                            try {
                              await api('/api/messages/preferences', { method: 'POST', body: JSON.stringify({ peerId: c.id, pinned: !c.pinned }) })
                              setArchivedConvs((prev) => prev.map((x) => (x.id === c.id ? { ...x, pinned: !x.pinned } : x)))
                            } catch (e: any) { toast.error(e.message) }
                          }}
                          onToggleMute={async () => {
                            try {
                              await api('/api/messages/preferences', { method: 'POST', body: JSON.stringify({ peerId: c.id, muted: !c.muted }) })
                              setArchivedConvs((prev) => prev.map((x) => (x.id === c.id ? { ...x, muted: !x.muted } : x)))
                            } catch (e: any) { toast.error(e.message) }
                          }}
                          onToggleArchive={() => handleToggleArchive(c, true)}
                          onMoveToFolder={() => setMoveTarget(c)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="fc-scroll m-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2, 3].map((i) => (
                <ConvRowSkeleton key={i} />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              icon={<Users size={36} />}
              title={q ? 'No matching groups' : 'No groups yet'}
              description={q ? 'Try a different search.' : 'Create a group from the Groups tab to chat with multiple friends.'}
            />
          ) : (
            <div className="space-y-0.5">
              {filteredGroups.map((g) => (
                <GroupRow
                  key={g.id}
                  group={g}
                  isTyping={typingConvs.has(`group:${g.id}`)}
                  onOpen={() => openGroupChat(g.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      )}

      {/* Round 10: move-to-folder dialog — opened from the ConversationRow
          long-press menu. Lets the user type a new folder name or pick from
          existing folders, plus a "Remove from folder" option. */}
      <MoveToFolderDialog
        conversation={moveTarget}
        existingFolders={existingFolders}
        onClose={() => setMoveTarget(null)}
        onConfirm={handleMoveToFolder}
      />
    </div>
  )
}

function ConversationRow({
  conversation,
  online,
  meId,
  draftPreview,
  isTyping,
  archived,
  onOpen,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onMoveToFolder,
}: {
  conversation: Conversation
  online: boolean
  meId?: string
  draftPreview?: string
  isTyping?: boolean
  archived?: boolean
  onOpen: () => void
  onTogglePin: () => void
  onToggleMute: () => void
  onToggleArchive: () => void
  // Round 10: open the move-to-folder dialog (passes the conversation up to
  // the parent ConversationList, which owns the dialog state so it can show
  // the full list of existing folders as quick-pick chips).
  onMoveToFolder?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pinned, setPinned] = useState(!!conversation.pinned)
  const [muted, setMuted] = useState(!!conversation.muted)

  useEffect(() => {
    setPinned(!!conversation.pinned)
    setMuted(!!conversation.muted)
  }, [conversation.pinned, conversation.muted])

  const startPress = () => {
    pressTimer.current = setTimeout(() => setMenuOpen(true), 500)
  }
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-accent/50',
          pinned && 'bg-primary/5',
          archived && 'opacity-70'
        )}
      >
        <UserAvatar name={conversation.name} src={conversation.photoUrl} size={48} online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold">
              <span className="truncate">{conversation.name}</span>
              {pinned && <Pin size={11} className="shrink-0 text-primary" />}
              {muted && <BellOff size={11} className="shrink-0 text-muted-foreground" />}
              {archived && <Archive size={11} className="shrink-0 text-muted-foreground" />}
            </span>
            {conversation.lastMessage && (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {timeAgo(conversation.lastMessage.createdAt)}
              </span>
            )}
          </div>
          {isTyping ? (
            // Round 7: typing-status takes priority over both draft +
            // last-message preview — it's the most time-sensitive info
            // ("the peer is about to send a message"). Unread badge still
            // shows alongside.
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="truncate text-xs italic text-primary">typing…</span>
              {conversation.unread > 0 && (
                <span
                  className={cn(
                    'grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-bold',
                    muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                  )}
                >
                  {conversation.unread > 9 ? '9+' : conversation.unread}
                </span>
              )}
            </div>
          ) : draftPreview ? (
            // Draft indicator takes priority over the last-message preview so
            // the user sees their unsaved text at a glance.
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1 truncate text-xs text-primary">
                <Pencil size={11} className="shrink-0" />
                <span className="truncate">Draft: {draftPreview}</span>
              </span>
              {conversation.unread > 0 && (
                <span
                  className={cn(
                    'grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-bold',
                    muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                  )}
                >
                  {conversation.unread > 9 ? '9+' : conversation.unread}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'truncate text-xs',
                  conversation.unread > 0 && !muted ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {lastMessagePreview(conversation, meId)}
              </span>
              {conversation.unread > 0 && (
                <span
                  className={cn(
                    'grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-bold',
                    muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                  )}
                >
                  {conversation.unread > 9 ? '9+' : conversation.unread}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-12 z-30 w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl fc-rise">
            <button
              onClick={() => { onTogglePin(); setPinned((p) => !p); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <Pin size={14} /> {pinned ? 'Unpin chat' : 'Pin chat'}
            </button>
            <button
              onClick={() => { onToggleMute(); setMuted((m) => !m); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              {muted ? <Bell size={14} /> : <BellOff size={14} />} {muted ? 'Unmute' : 'Mute notifications'}
            </button>
            <button
              onClick={() => { onToggleArchive(); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {archived ? 'Unarchive' : 'Archive chat'}
            </button>
            {onMoveToFolder && (
              <button
                onClick={() => { onMoveToFolder(); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
              >
                <Move size={14} /> {conversation.folder ? 'Change folder' : 'Move to folder'}
                {conversation.folder && (
                  <span className="ml-auto truncate text-[10px] text-muted-foreground">{conversation.folder}</span>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Round 10: MoveToFolderDialog — opened from the ConversationRow long-press
 * menu. Lets the user type a new folder name (max 50 chars) or pick from
 * existing folders as quick-pick chips. Includes a "Remove from folder"
 * option (only shown when the conversation is already in a folder).
 *
 * The parent ConversationList owns this dialog's open state via `conversation`
 * (null = closed) so it can pass the full list of existing folders as chips.
 * On confirm, calls `onConfirm(peerId, folderName)` — empty string clears the
 * folder (sends `folder: ''` to the backend, which the API treats as null =
 * back to the "All" section).
 */
function MoveToFolderDialog({
  conversation,
  existingFolders,
  onClose,
  onConfirm,
}: {
  conversation: Conversation | null
  existingFolders: string[]
  onClose: () => void
  onConfirm: (peerId: string, folder: string) => void
}) {
  const [folderName, setFolderName] = useState('')

  // Reset the input each time a new conversation is targeted / dialog closed.
  useEffect(() => {
    if (conversation) {
      setFolderName(conversation.folder || '')
    }
  }, [conversation])

  if (!conversation) return null

  const trimmed = folderName.trim()
  const trimmedLower = trimmed.toLowerCase()
  const isNewName = trimmed.length > 0 && !existingFolders.some((f) => f.toLowerCase() === trimmedLower)
  const canMove = trimmed.length > 0 && trimmed !== (conversation.folder || '')

  const handleMove = () => {
    if (canMove) onConfirm(conversation.id, trimmed)
  }
  const handleRemove = () => {
    onConfirm(conversation.id, '')
  }

  return (
    <Dialog open={!!conversation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Folder size={16} className="text-primary" />
            Move to folder
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Choose a folder for <span className="font-medium text-foreground">{conversation.name}</span>.
          </p>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Type a new folder name…"
            maxLength={50}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canMove) {
                e.preventDefault()
                handleMove()
              }
            }}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{isNewName ? 'Creates a new folder' : '\u00A0'}</span>
            <span>{trimmed.length}/50</span>
          </div>

          {existingFolders.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Existing folders
              </div>
              <div className="flex flex-wrap gap-1.5">
                {existingFolders.map((f) => {
                  const selected = trimmedLower === f.toLowerCase()
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFolderName(f)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition',
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-foreground hover:bg-accent/70'
                      )}
                    >
                      <Folder size={10} />
                      {f}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {conversation.folder && (
            <button
              type="button"
              onClick={handleRemove}
              className="mt-3 flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10"
            >
              <Move size={14} />
              Remove from "{conversation.folder}"
            </button>
          )}
        </div>
        <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleMove} disabled={!canMove}>
            <Move size={14} className="mr-1" />
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GroupRow({
  group,
  isTyping,
  onOpen,
}: {
  group: GroupLite
  isTyping?: boolean
  onOpen: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-accent/50"
    >
      {group.photoUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
          <img src={group.photoUrl} alt={group.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-border">
          <Users size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{group.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(group.createdAt)}</span>
        </div>
        {isTyping ? (
          // Round 7: someone in this group is typing — show "Someone is
          // typing…" in place of the member-count subtitle.
          <div className="truncate text-xs italic text-primary">Someone is typing…</div>
        ) : (
          <div className="truncate text-xs text-muted-foreground">
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
            {group.description ? ` · ${group.description}` : ''}
          </div>
        )}
      </div>
    </button>
  )
}

function ConvRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2.5">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

// ---------------- chat room (direct + group) ----------------
function ChatRoom({
  mode,
  peerId,
  onBack,
}: {
  mode: 'direct' | 'group'
  peerId: string
  onBack: () => void
}) {
  const { user: me } = useAuth()
  const { socket, isOnline } = useSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [peerInfo, setPeerInfo] = useState<PeerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null)
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null)
  const [editTarget, setEditTarget] = useState<Message | null>(null)
  // Round 7: reply-with-quote. When set, a reply preview bar renders above
  // the input bar (sender name + truncated content + X to cancel) and the
  // next sent message includes `replyToId: replyTo.id`. Cleared on send,
  // on X-tap, and on peerId-change (so a stale reply target from a previous
  // chat doesn't bleed across).
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  // Round 8: scheduled-message composer + viewer state. The composer opens
  // via the clock icon in the input bar (prefilled with the current draft
  // text) and POSTs to /api/messages/scheduled with scheduledFor in the
  // future (stored but NOT delivered — a future cron enhancement will emit
  // the message when its time arrives). The viewer lists scheduled messages
  // for the current conversation and supports cancellation.
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduledViewerOpen, setScheduledViewerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [starredDialogOpen, setStarredDialogOpen] = useState(false)
  // Round 10: message reminders. `remindTarget` is the message the user
  // long-pressed → opened the Remind dialog on. `remindersDialogOpen` toggles
  // the global Reminders viewer (opened from the ChatSettingsSheet).
  const [remindTarget, setRemindTarget] = useState<Message | null>(null)
  const [remindersDialogOpen, setRemindersDialogOpen] = useState(false)
  const [disappearing, setDisappearing] = useState<'OFF' | '24H' | '7D'>('OFF')
  const [wallpaper, setWallpaper] = useState<string | null>(null)
  // Group typing (sender-aware): set of userIds currently typing in this group
  // chat (excludes me — the realtime service emits to everyone *but* the typer,
  // and we filter again here for safety). Reset to empty when peerId changes.
  const [groupTypingUsers, setGroupTypingUsers] = useState<Set<string>>(new Set())
  // Member names lookup for the group typing indicator ("Aria is typing…").
  // Built once per group chat open via GET /api/groups/:id.
  const [groupMembers, setGroupMembers] = useState<Map<string, string>>(new Map())
  // Derived count of group members currently typing (defined here so the
  // auto-scroll effect below can reference it without a temporal-dead-zone error).
  const groupTypingCount = groupTypingUsers.size
  // Round 6: per-user message pin (1:1 only). Derived here — BEFORE the
  // auto-scroll effect below — so any effect/handler that references it is
  // safe from temporal-dead-zone errors. The backend enforces "only one
  // pinned message per 1:1 conversation per user", so we find the first
  // (only) message pinned by me in the current conversation, excluding
  // deleted-for-me/everyone messages (a deleted pinned message shouldn't
  // surface in the pin bar). null in group mode or when nothing is pinned.
  // NOTE: pinnedMessage is defined AFTER meId below to avoid a temporal-dead-zone error.

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const atBottomRef = useRef(true)
  const oldestTsRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordStreamRef = useRef<MediaStream | null>(null)
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevHeightRef = useRef(0)
  const skipAutoScrollRef = useRef(false)
  // Draft auto-save: a ref mirror of `text` so the peerId-change cleanup can
  // read the *current* text without a stale closure, and a debounce timer.
  const textRef = useRef('')
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const meId = me?.id

  // Round 6: per-user message pin (1:1 only). Defined AFTER meId to avoid a
  // temporal-dead-zone error. Finds the message pinned by me in this conversation.
  const pinnedMessage =
    mode === 'direct' && meId
      ? messages.find((m) => m.pinnedBy === meId && !isDeletedForMe(m, meId)) || null
      : null

  // keep textRef in sync with `text` (so cleanup reads the latest typed value)
  useEffect(() => {
    textRef.current = text
  }, [text])

  // ---- load history + peer info ----
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    setHasMore(true)
    setPeerTyping(false)
    setPeerInfo(null)
    // Reset group typing state for the new conversation (so a stale "X is
    // typing…" indicator doesn't bleed across chats when switching rooms).
    setGroupTypingUsers(new Set())
    // Round 7: clear any in-progress reply target when switching rooms.
    setReplyTo(null)
    // Reset the input for the new conversation; the draft (if any) is restored
    // below.
    setText('')
    // Cancel any pending draft autosave from the previous conversation.
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current)
      draftSaveTimerRef.current = null
    }
    oldestTsRef.current = null
    atBottomRef.current = true

    const endpoint = `/api/messages?${mode === 'direct' ? 'userId' : 'groupId'}=${encodeURIComponent(peerId)}`

    Promise.all([
      api<{ messages: Message[] }>(endpoint)
        .then((d) => d.messages)
        .catch((e: any) => {
          toast.error(e?.message || 'Failed to load messages')
          return [] as Message[]
        }),
      mode === 'direct'
        ? api<{ friends: Friend[] }>('/api/friends')
            .then((d) => d.friends.find((f) => f.id === peerId) || null)
            .then((friend): PeerInfo | null => {
              if (friend) {
                return {
                  name: friend.name,
                  photoUrl: friend.photoUrl,
                  username: friend.username,
                  lastSeen: friend.lastSeen,
                }
              }
              // fallback to conversations endpoint (peer may not be a friend yet but has messages)
              return api<{ conversations: Conversation[]; archived: Conversation[] }>('/api/messages/conversations')
                .then((d) => {
                  const c = d.conversations.find((c) => c.id === peerId) || d.archived.find((c) => c.id === peerId)
                  return c
                    ? { name: c.name, photoUrl: c.photoUrl, username: c.username, lastSeen: null }
                    : null
                })
                .catch(() => null)
            })
            .catch(() => null)
        : api<{ groups: GroupLite[] }>('/api/groups')
            .then((d) => {
              const g = d.groups.find((g) => g.id === peerId)
              return g
                ? { name: g.name, photoUrl: g.photoUrl, memberCount: g.memberCount }
                : null
            })
            .catch(() => null),
    ])
      .then(([msgs, info]) => {
        if (cancelled) return
        const normalized = msgs.map(normalizeMessage)
        setMessages(normalized)
        if (normalized.length > 0) oldestTsRef.current = normalized[0].createdAt
        if (normalized.length < 50) setHasMore(false)
        if (info) setPeerInfo(info)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // Restore any saved draft for this peer (so the user picks up where they
    // left off). isGroup is derived from `mode` for this same conversation.
    const isGroup = mode === 'group'
    api<{ draft: { content: string; updatedAt: string } | null }>(
      `/api/messages/drafts?peerId=${encodeURIComponent(peerId)}&isGroup=${isGroup}`
    )
      .then((d) => {
        if (cancelled) return
        if (d.draft && d.draft.content) {
          setText(d.draft.content)
          toast.success('Draft restored', { duration: 1500 })
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      // Save the draft one last time for the conversation we're leaving so it
      // doesn't get lost. The closure captures the OLD peerId/mode; textRef
      // holds the latest typed value at the moment of cleanup.
      const leavingPeerId = peerId
      const leavingIsGroup = isGroup
      const content = textRef.current
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = null
      }
      if (content.trim()) {
        api('/api/messages/drafts', {
          method: 'POST',
          body: JSON.stringify({ peerId: leavingPeerId, isGroup: leavingIsGroup, content }),
        }).catch(() => {})
      }
    }
  }, [mode, peerId])

  // ---- load chat preferences (disappearing + wallpaper) for this peer ----
  useEffect(() => {
    setDisappearing('OFF')
    setWallpaper(null)
    let cancelled = false
    api<{ preferences: Array<{ peerId: string; disappearing: string; wallpaper: string | null }> }>(
      '/api/messages/preferences'
    )
      .then((d) => {
        if (cancelled) return
        const p = d.preferences?.find((x) => x.peerId === peerId)
        if (p) {
          setDisappearing(p.disappearing === '24H' || p.disappearing === '7D' ? p.disappearing : 'OFF')
          setWallpaper(p.wallpaper ?? null)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [peerId])

  // ---- fetch group members (userId → name) once on entering a group chat ----
  // Used by the sender-aware group typing indicator to show "Aria is typing…"
  // instead of a generic "Someone is typing…".
  useEffect(() => {
    if (mode !== 'group') {
      setGroupMembers(new Map())
      return
    }
    let cancelled = false
    api<{
      group: {
        id: string
        name: string
        members: Array<{ id: string; name: string; username: string }>
      }
    }>(`/api/groups/${encodeURIComponent(peerId)}`)
      .then((d) => {
        if (cancelled) return
        const map = new Map<string, string>()
        for (const m of d.group?.members || []) {
          map.set(m.id, m.name || m.username || 'Someone')
        }
        setGroupMembers(map)
      })
      .catch(() => {
        // Non-fatal: typing indicator falls back to "Someone is typing…".
      })
    return () => {
      cancelled = true
    }
  }, [mode, peerId])

  // ---- jump to bottom after first load ----
  useEffect(() => {
    if (loading) return
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end' })
    })
    return () => cancelAnimationFrame(id)
  }, [loading])

  // ---- auto-scroll on new messages ----
  useEffect(() => {
    if (loading) return
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false
      return
    }
    if (loadingOlder) return
    if (!atBottomRef.current) return
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [messages.length, peerTyping, groupTypingCount, loading, loadingOlder])

  // ---- socket subscriptions ----
  useEffect(() => {
    if (!socket || !meId) return

    const isRelevant = (raw: any): boolean => {
      if (!raw) return false
      if (mode === 'direct') {
        if (raw.groupId) return false
        return (
          (raw.senderId === peerId && raw.receiverId === meId) ||
          (raw.senderId === meId && raw.receiverId === peerId)
        )
      }
      return raw.groupId === peerId
    }

    const onNew = (raw: any) => {
      if (!isRelevant(raw)) return
      const msg = normalizeMessage(raw)
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // mark realtime incoming 1:1 messages as seen
      if (mode === 'direct' && msg.senderId === peerId && msg.receiverId === meId) {
        socket.emit(RT.MESSAGE_SEEN, { messageId: msg.id })
      }
    }

    const onStatus = ({ id, status }: { id: string; status: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: status as MessageStatus } : m))
      )
    }

    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (mode === 'direct' && userId === peerId) setPeerTyping(isTyping)
    }

    const onReaction = ({ messageId, userId, emoji, action }: { messageId: string; userId: string; emoji: string; action: 'add' | 'remove' }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m
          const reactions = m.reactions ? [...m.reactions] : []
          if (action === 'add') {
            if (!reactions.some((r) => r.userId === userId && r.emoji === emoji)) {
              reactions.push({ emoji, userId, userName: '' })
            }
          } else {
            const idx = reactions.findIndex((r) => r.userId === userId && r.emoji === emoji)
            if (idx >= 0) reactions.splice(idx, 1)
          }
          return { ...m, reactions }
        })
      )
    }

    // Realtime message delete: when another participant deletes a message for
    // everyone, the server emits message:deleted { messageId, scope:'everyone' }.
    // We swap the local message for the "🚫 This message was deleted" placeholder.
    const onDeleted = ({ messageId, scope }: { messageId: string; scope: string }) => {
      if (scope !== 'everyone') return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                deletedFor: 'everyone',
                content: '',
                fileUrl: null,
                fileName: null,
                fileSize: null,
                mimeType: null,
                type: 'text',
                reactions: [],
              }
            : m
        )
      )
    }

    // Realtime message edit: server emits message:edited { messageId, content,
    // editedAt } to sender + receiver + group members. We update the matching
    // local message in place. Safe to receive for a message we just edited
    // (idempotent — same content + editedAt we set optimistically).
    const onEdited = ({
      messageId,
      content,
      editedAt,
    }: {
      messageId: string
      content: string
      editedAt?: string
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content,
                edited: true,
                editedAt: editedAt || m.editedAt || new Date().toISOString(),
              }
            : m
        )
      )
    }

    // Group typing (sender-aware): server emits group:typing:indicator
    // { groupId, userId, isTyping } to all other group members (excludes the
    // typer). We filter by groupId + ignore our own id (defensive) and track
    // the set of userIds currently typing so the indicator can show "Aria is
    // typing…" or "3 people are typing…".
    const onGroupTyping = ({
      groupId,
      userId,
      isTyping,
    }: {
      groupId: string
      userId: string
      isTyping: boolean
    }) => {
      if (mode !== 'group' || groupId !== peerId) return
      if (userId === meId) return
      setGroupTypingUsers((prev) => {
        const next = new Set(prev)
        if (isTyping) next.add(userId)
        else next.delete(userId)
        return next
      })
    }

    socket.on(RT.MESSAGE_NEW, onNew)
    socket.on(RT.GROUP_MESSAGE_NEW, onNew)
    socket.on(RT.MESSAGE_STATUS, onStatus)
    socket.on(RT.TYPING_INDICATOR, onTyping)
    socket.on(RT.REACTION_UPDATE, onReaction)
    socket.on(RT.MESSAGE_DELETED, onDeleted)
    socket.on(RT.MESSAGE_EDITED, onEdited)
    socket.on(RT.GROUP_TYPING_INDICATOR, onGroupTyping)

    return () => {
      socket.off(RT.MESSAGE_NEW, onNew)
      socket.off(RT.GROUP_MESSAGE_NEW, onNew)
      socket.off(RT.MESSAGE_STATUS, onStatus)
      socket.off(RT.TYPING_INDICATOR, onTyping)
      socket.off(RT.REACTION_UPDATE, onReaction)
      socket.off(RT.MESSAGE_DELETED, onDeleted)
      socket.off(RT.MESSAGE_EDITED, onEdited)
      socket.off(RT.GROUP_TYPING_INDICATOR, onGroupTyping)
      if (mode === 'direct') {
        socket.emit(RT.TYPING, { receiverId: peerId, isTyping: false })
      }
      if (mode === 'group') {
        socket.emit(RT.GROUP_TYPING, { groupId: peerId, isTyping: false })
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [socket, meId, peerId, mode])

  // ---- toggle reaction on a message ----
  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket) return
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m
          const reactions = m.reactions ? [...m.reactions] : []
          const existing = reactions.find((r) => r.userId === meId && r.emoji === emoji)
          if (existing) {
            const idx = reactions.indexOf(existing)
            reactions.splice(idx, 1)
            socket.emit(RT.REACTION_REMOVE, { messageId, emoji })
          } else {
            reactions.push({ emoji, userId: meId, userName: me?.name || '' })
            socket.emit(RT.REACTION_ADD, { messageId, emoji })
          }
          return { ...m, reactions }
        })
      )
    },
    [socket, meId, me]
  )

  // ---- reply (set the message being replied to — shows a preview bar above
  // the input + the next send includes replyToId in the socket payload) ----
  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg)
  }, [])

  // ---- delete message (for me / for everyone) ----
  const confirmDelete = useCallback(
    async (msg: Message, scope: 'me' | 'everyone') => {
      setDeleteTarget(null)
      try {
        await api(`/api/messages/${msg.id}/delete`, {
          method: 'POST',
          body: JSON.stringify({ scope }),
        })
        if (scope === 'me') {
          // optimistic: remove from local view immediately
          setMessages((prev) => prev.filter((m) => m.id !== msg.id))
          toast.success('Message deleted for you')
        } else {
          // tell other participants via realtime + swap local for placeholder
          if (socket) {
            socket.emit(RT.MESSAGE_DELETE, { messageId: msg.id, scope: 'everyone' })
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    deletedFor: 'everyone',
                    content: '',
                    fileUrl: null,
                    fileName: null,
                    fileSize: null,
                    mimeType: null,
                    type: 'text',
                    reactions: [],
                  }
                : m
            )
          )
          toast.success('Message deleted for everyone')
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to delete message')
      }
    },
    [socket]
  )

  // ---- toggle star on a message (optimistic + API) ----
  const toggleStar = useCallback(async (msg: Message) => {
    const next = !msg.starred
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, starred: next } : m)))
    try {
      if (next) {
        await api(`/api/messages/${msg.id}/star`, { method: 'POST' })
        toast.success('Starred')
      } else {
        await api(`/api/messages/${msg.id}/star`, { method: 'DELETE' })
        toast.success('Unstarred')
      }
    } catch (e: any) {
      // revert on failure
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, starred: !next } : m)))
      toast.error(e?.message || 'Failed to update star')
    }
  }, [])

  // ---- toggle pin on a message (1:1 only, per-user) ----
  // Round 6: the backend enforces "only one pinned message per 1:1 conversation
  // per user". On pin: server unpins any previously pinned message by me in
  // the same conversation, then sets pinnedBy=me.id on the new one. We mirror
  // that optimistically on the client: clear pinnedBy on any message I had
  // pinned in this conversation, then set/clear pinnedBy on the target. On
  // error we revert the target's pinnedBy only (the previous-pin clear is
  // idempotent + the server is the source of truth on next reload).
  const togglePin = useCallback(
    async (msg: Message) => {
      if (!meId || mode !== 'direct') return
      const isCurrentlyPinned = msg.pinnedBy === meId
      const nextPinned = !isCurrentlyPinned
      setMessages((prev) =>
        prev
          .map((m) => (m.pinnedBy === meId ? { ...m, pinnedBy: null } : m))
          .map((m) => (m.id === msg.id ? { ...m, pinnedBy: nextPinned ? meId : null } : m))
      )
      try {
        await api(`/api/messages/${msg.id}/pin`, {
          method: 'POST',
          body: JSON.stringify({ pinned: nextPinned }),
        })
        toast.success(nextPinned ? 'Message pinned' : 'Message unpinned')
      } catch (e: any) {
        // Revert the target's pinnedBy to its prior state. The previous-pin
        // clear is left as-is (a subsequent reload will reconcile).
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, pinnedBy: isCurrentlyPinned ? meId : null } : m
          )
        )
        toast.error(e?.message || 'Failed to update pin')
      }
    },
    [meId, mode]
  )

  // ---- scroll to a specific message in the messages list (used by the
  // pinned-message bar so the user can jump back to the pinned bubble) ----
  // Looks up the message element via its `data-msg-id` attribute and uses
  // scrollIntoView({ block: 'center' }) so the browser handles the nearest
  // scroll container (the messages scroll area). No-op if the element isn't
  // mounted (e.g. the pinned message is older than the loaded page).
  const scrollToMessage = useCallback((msgId: string) => {
    const el = scrollRef.current?.querySelector(`[data-msg-id="${CSS.escape(msgId)}"]`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // ---- edit a message (sender only, within 15-min window) ----
  // Tries realtime first (socket.emit with ack) for instant propagation to
  // other participants; falls back to POST /api/messages/[id]/edit if the
  // socket is unavailable or didn't ack. On success, updates the local
  // message in place (content + edited=true + editedAt) and toasts. Throws
  // on error so the dialog can keep open + show the error toast.
  const handleEditSave = useCallback(
    async (msg: Message, content: string): Promise<void> => {
      if (!meId) throw new Error('Not authenticated')

      let realtimeOk = false
      if (socket) {
        const ack = await new Promise<any>((resolve) => {
          // Socket.io v4+ ack: third arg is the callback. We wrap it in a
          // promise for cleaner async flow + a 10s timeout guard so a
          // missing ack doesn't hang the dialog forever.
          const timer = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 10000)
          socket.emit(
            RT.MESSAGE_EDIT,
            { messageId: msg.id, content },
            (ack: any) => {
              clearTimeout(timer)
              resolve(ack)
            }
          )
        })
        if (ack?.ok) {
          realtimeOk = true
        } else if (ack?.error) {
          // Surface server-side errors (e.g. "edit window expired",
          // "forbidden", "empty") to the user.
          throw new Error(String(ack.error))
        }
      }

      let editedAt: string | null = null
      if (!realtimeOk) {
        // REST fallback — uses the authoritative editedAt from the server.
        const res = await api<{
          message: { id: string; content: string; edited: boolean; editedAt: string | null }
        }>(`/api/messages/${msg.id}/edit`, {
          method: 'POST',
          body: JSON.stringify({ content }),
        })
        editedAt = res.message?.editedAt ?? null
      } else {
        editedAt = new Date().toISOString()
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, content, edited: true, editedAt: editedAt || new Date().toISOString() }
            : m
        )
      )
      toast.success('Message edited')
    },
    [socket, meId]
  )

  // ---- update disappearing messages preference ----
  const handleDisappearingChange = useCallback(
    async (value: 'OFF' | '24H' | '7D') => {
      const prev = disappearing
      setDisappearing(value)
      try {
        await api('/api/messages/preferences', {
          method: 'POST',
          body: JSON.stringify({ peerId, disappearing: value }),
        })
        toast.success(
          value === 'OFF'
            ? 'Disappearing messages off'
            : `Messages disappear after ${value === '24H' ? '24 hours' : '7 days'}`
        )
      } catch (e: any) {
        setDisappearing(prev)
        toast.error(e?.message || 'Failed to update')
      }
    },
    [peerId, disappearing]
  )

  // ---- update wallpaper preference ----
  const handleWallpaperChange = useCallback(
    async (value: string) => {
      const prev = wallpaper
      setWallpaper(value || null)
      try {
        await api('/api/messages/preferences', {
          method: 'POST',
          body: JSON.stringify({ peerId, wallpaper: value || null }),
        })
        toast.success(value ? 'Wallpaper updated' : 'Wallpaper cleared')
      } catch (e: any) {
        setWallpaper(prev)
        toast.error(e?.message || 'Failed to update wallpaper')
      }
    },
    [peerId, wallpaper]
  )

  // ---- upload a custom wallpaper image and apply it ----
  const handleCustomWallpaperUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file')
        return
      }
      // Optimistic: leave current wallpaper untouched until upload + POST succeed.
      const prev = wallpaper
      try {
        const { file: uploaded } = await uploadFile(file)
        // Single-quote the url so special chars in the URL don't break the CSS value.
        const value = `url('${uploaded.url}')`
        setWallpaper(value)
        await api('/api/messages/preferences', {
          method: 'POST',
          body: JSON.stringify({ peerId, wallpaper: value }),
        })
        toast.success('Custom wallpaper set')
      } catch (e: any) {
        setWallpaper(prev)
        toast.error(e?.message || 'Failed to upload wallpaper')
        throw e
      }
    },
    [peerId, wallpaper]
  )

  // ---- scroll handling + infinite scroll up ----
  const loadOlder = useCallback(async () => {
    if (!oldestTsRef.current) return
    setLoadingOlder(true)
    const el = scrollRef.current
    prevHeightRef.current = el?.scrollHeight || 0
    try {
      const endpoint = `/api/messages?${mode === 'direct' ? 'userId' : 'groupId'}=${encodeURIComponent(peerId)}&before=${encodeURIComponent(oldestTsRef.current)}`
      const data = await api<{ messages: Message[] }>(endpoint)
      if (data.messages.length === 0) {
        setHasMore(false)
      } else {
        const normalized = data.messages.map(normalizeMessage)
        skipAutoScrollRef.current = true
        setMessages((prev) => [...normalized, ...prev])
        oldestTsRef.current = normalized[0]?.createdAt || oldestTsRef.current
        if (normalized.length < 50) setHasMore(false)
        // restore scroll position after DOM update
        requestAnimationFrame(() => {
          if (el) {
            const newHeight = el.scrollHeight
            el.scrollTop = newHeight - prevHeightRef.current
          }
        })
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }, [mode, peerId])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distFromBottom < 80
    if (el.scrollTop < 60 && hasMore && !loadingOlder && !loading && oldestTsRef.current) {
      loadOlder()
    }
  }, [hasMore, loadingOlder, loading, loadOlder])

  // ---- send text ----
  const sendMessage = useCallback(
    (partial: Pick<Message, 'content' | 'type' | 'fileUrl' | 'fileName' | 'fileSize' | 'mimeType'>) => {
      if (!socket || !meId) return
      const tempId = newTempId()
      const optimistic: Message = {
        id: tempId,
        tempId,
        senderId: meId,
        senderName: me?.name || null,
        senderPhoto: me?.profile?.photoUrl ?? null,
        receiverId: mode === 'direct' ? peerId : null,
        groupId: mode === 'group' ? peerId : null,
        content: partial.content,
        type: partial.type,
        fileUrl: partial.fileUrl ?? null,
        fileName: partial.fileName ?? null,
        fileSize: partial.fileSize ?? null,
        mimeType: partial.mimeType ?? null,
        status: 'SENDING',
        createdAt: new Date().toISOString(),
        // Round 7: mirror the reply target on the optimistic bubble so the
        // reply quote card renders immediately (before the server ack).
        replyToId: replyTo?.id ?? null,
      }
      setMessages((prev) => [...prev, optimistic])
      atBottomRef.current = true

      const payload: any = {
        tempId,
        content: partial.content,
        type: partial.type,
        fileUrl: partial.fileUrl ?? undefined,
        fileName: partial.fileName ?? undefined,
        fileSize: partial.fileSize ?? undefined,
        mimeType: partial.mimeType ?? undefined,
        ...(mode === 'direct' ? { receiverId: peerId } : { groupId: peerId }),
      }
      // Round 7: include replyToId when the user is replying to a message.
      if (replyTo) payload.replyToId = replyTo.id
      const event = mode === 'direct' ? RT.MESSAGE_SEND : RT.GROUP_MESSAGE_SEND
      socket.emit(event, payload, (ack: any) => {
        if (ack?.ok && ack.message) {
          const realMsg: Message = {
            ...normalizeMessage(ack.message),
            tempId,
            senderName: ack.message.senderName ?? ack.message.sender?.name ?? me?.name ?? null,
            senderPhoto: ack.message.senderPhoto ?? ack.message.sender?.profile?.photoUrl ?? me?.profile?.photoUrl ?? null,
          }
          setMessages((prev) => prev.map((m) => (m.tempId === tempId ? realMsg : m)))
        } else {
          // leave optimistic in place with SENT fallback so user can retry
          setMessages((prev) =>
            prev.map((m) => (m.tempId === tempId ? { ...m, status: 'SENT' } : m))
          )
          toast.error(ack?.error || 'Failed to send message')
        }
      })
      // Round 7: clear the reply target after the send has been initiated
      // (the optimistic bubble already carries replyToId so the quote card
      // stays visible; we don't need to wait for the server ack).
      setReplyTo(null)
    },
    [socket, meId, me, mode, peerId, replyTo]
  )

  const sendText = useCallback(() => {
    const content = text.trim()
    if (!content) return
    sendMessage({ content, type: 'text', fileUrl: null, fileName: null, fileSize: null, mimeType: null })
    setText('')
    // Clear the draft now that the message has been sent (don't leave a
    // lingering draft behind). Cancel any pending debounce-save first.
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current)
      draftSaveTimerRef.current = null
    }
    const isGroup = mode === 'group'
    api(`/api/messages/drafts?peerId=${encodeURIComponent(peerId)}&isGroup=${isGroup}`, {
      method: 'DELETE',
    }).catch(() => {})
    if (socket && mode === 'direct') {
      socket.emit(RT.TYPING, { receiverId: peerId, isTyping: false })
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
    if (socket && mode === 'group') {
      // Stop the typing indicator on send so other group members see the
      // message arrive instead of a lingering "X is typing…" bubble.
      socket.emit(RT.GROUP_TYPING, { groupId: peerId, isTyping: false })
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [text, sendMessage, socket, mode, peerId])

  // ---- send file ----
  const sendFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const { file: uploaded } = await uploadFile(file)
        const type = fileTypeFromMime(uploaded.mimeType)
        sendMessage({
          content: '',
          type,
          fileUrl: uploaded.url,
          fileName: uploaded.name,
          fileSize: uploaded.size,
          mimeType: uploaded.mimeType,
        })
      } catch (e: any) {
        toast.error(e?.message || 'Upload failed')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [sendMessage]
  )

  // ---- voice note recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordStreamRef.current = stream
      recordedChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const ext = (mr.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type })
        await sendFile(file)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordSecs(0)
      recordTimerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000)
    } catch (e: any) {
      toast.error(e?.message || 'Microphone access denied')
    }
  }, [sendFile])

  const stopRecording = useCallback((cancel: boolean = false) => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      if (cancel) {
        mr.onstop = null
        mr.stop()
      } else {
        mr.stop()
      }
    }
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach((t) => t.stop())
      recordStreamRef.current = null
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current)
      recordTimerRef.current = null
    }
    setRecording(false)
    setRecordSecs(0)
  }, [])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordStreamRef.current) recordStreamRef.current.getTracks().forEach((t) => t.stop())
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      // Cancel any pending draft debounce-save on unmount; the peerId-change
      // cleanup already saves the final draft for the active conversation.
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = null
      }
    }
  }, [])

  // ---- search reload ----
  const runSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q)
      if (!q.trim()) {
        // reload normal history
        try {
          const endpoint = `/api/messages?${mode === 'direct' ? 'userId' : 'groupId'}=${encodeURIComponent(peerId)}`
          const data = await api<{ messages: Message[] }>(endpoint)
          setMessages(data.messages.map(normalizeMessage))
          if (data.messages.length > 0) oldestTsRef.current = data.messages[0].createdAt
          setHasMore(data.messages.length >= 50)
        } catch {}
        return
      }
      try {
        const endpoint = `/api/messages?${mode === 'direct' ? 'userId' : 'groupId'}=${encodeURIComponent(peerId)}&q=${encodeURIComponent(q)}`
        const data = await api<{ messages: Message[] }>(endpoint)
        setMessages(data.messages.map(normalizeMessage))
        setHasMore(false)
      } catch {}
    },
    [mode, peerId]
  )

  // ---- typing ----
  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setText(value)
    if (socket && mode === 'direct') {
      socket.emit(RT.TYPING, { receiverId: peerId, isTyping: true })
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socket.emit(RT.TYPING, { receiverId: peerId, isTyping: false })
      }, 1500)
    }
    if (socket && mode === 'group') {
      // Sender-aware group typing: emit isTyping:true on input, then debounce
      // a reset to false after 1.5s idle (same pattern as the 1:1 typing
      // indicator above). The server broadcasts group:typing:indicator to all
      // other members (excludes us — we never show our own typing indicator).
      socket.emit(RT.GROUP_TYPING, { groupId: peerId, isTyping: true })
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socket.emit(RT.GROUP_TYPING, { groupId: peerId, isTyping: false })
      }, 1500)
    }
    // Debounced draft auto-save (500ms idle). The backend deletes empty
    // drafts so we still POST when the user clears the field — this keeps
    // the conversation list "Draft: …" indicator in sync.
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null
      const isGroup = mode === 'group'
      api('/api/messages/drafts', {
        method: 'POST',
        body: JSON.stringify({ peerId, isGroup, content: value }),
      }).catch(() => {})
    }, 500)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendText()
    }
  }

  const startCall = (type: 'audio' | 'video') => {
    window.dispatchEvent(
      new CustomEvent('fc:start-call', { detail: { targetUserId: peerId, type } })
    )
  }

  const online = mode === 'direct' ? isOnline(peerId) : false
  // Group typing label for header + bubble — computed inline (cheap; runs
  // only when this ChatRoom re-renders, and the only changing deps are
  // groupTypingUsers and groupMembers which are both state).
  // (groupTypingCount is defined near the state declaration above so the
  // auto-scroll effect can reference it without a temporal-dead-zone error.)
  const groupTypingLabel = (() => {
    if (groupTypingCount === 0) return ''
    if (groupTypingCount === 1) {
      const userId = Array.from(groupTypingUsers)[0]
      const name = groupMembers.get(userId) || 'Someone'
      return `${name} is typing…`
    }
    return `${groupTypingCount} people are typing…`
  })()
  const headerStatus = mode === 'direct'
    ? peerTyping
      ? 'typing…'
      : lastSeenText(online, peerInfo?.lastSeen)
    : groupTypingLabel || `${peerInfo?.memberCount ?? 0} members`

  return (
    <div className="flex h-full flex-col bg-background">
      {/* header */}
      <header className="flex items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur">
        <button
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground transition hover:bg-accent"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {mode === 'direct' ? (
            <UserAvatar name={peerInfo?.name || 'User'} src={peerInfo?.photoUrl} size={38} online={online} />
          ) : peerInfo?.photoUrl ? (
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
              <img src={peerInfo.photoUrl} alt={peerInfo.name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-border">
              <Users size={18} />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">
              {peerInfo?.name || (loading ? 'Loading…' : 'Unknown')}
            </div>
            <div
              className={cn(
                'flex items-center gap-1 truncate text-xs leading-tight',
                peerTyping || groupTypingCount > 0 ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {disappearing !== 'OFF' && (
                <span
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
                  title={`Disappearing in ${disappearing === '24H' ? '24h' : '7d'}`}
                >
                  <Timer size={9} />
                  {disappearing === '24H' ? '24h' : '7d'}
                </span>
              )}
              <span className="truncate">{headerStatus}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {mode === 'direct' && (
            <>
              <button
                onClick={() => setSearchOpen((s) => !s)}
                className={cn('grid h-9 w-9 place-items-center rounded-full transition hover:bg-accent', searchOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary')}
                aria-label="Search messages"
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => startCall('audio')}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary"
                aria-label="Start audio call"
              >
                <Phone size={18} />
              </button>
              <button
                onClick={() => startCall('video')}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary"
                aria-label="Start video call"
              >
                <Video size={18} />
              </button>
            </>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary"
            aria-label="Chat settings"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <Search size={15} className="text-muted-foreground" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search messages in this chat…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchOpen(false); runSearch('') }}
              className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              aria-label="Close search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Round 6: pinned-message bar — shown at the top of the messages area
          (below the header / search bar, above the messages scroll) when there
          is a message pinned by me in this 1:1 conversation. The bar shows a
          Pin icon, the truncated message content, the sender name, and a small
          X to unpin. Tapping the bar (minus the X) scrolls the messages list
          to the pinned bubble so the user can re-read it in context. */}
      {pinnedMessage && mode === 'direct' && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <button
            type="button"
            onClick={() => scrollToMessage(pinnedMessage.id)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-label="Jump to pinned message"
          >
            <Pin size={14} className="shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">
                {pinnedMessage.content ||
                  (pinnedMessage.type === 'image'
                    ? '📷 Photo'
                    : pinnedMessage.type === 'video'
                      ? '🎥 Video'
                      : pinnedMessage.type === 'audio'
                        ? '🎤 Audio'
                        : pinnedMessage.fileName || '📄 Document')}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {pinnedMessage.senderId === meId
                  ? 'You'
                  : pinnedMessage.senderName || 'Unknown'}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => togglePin(pinnedMessage)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Unpin message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={wallpaper ? { background: wallpaper } : undefined}
        className="fc-scroll flex-1 overflow-y-auto px-3 py-3"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<MessageCircle size={36} />}
              title="No messages yet"
              description={
                mode === 'direct'
                  ? 'Say hello to start the conversation.'
                  : 'Be the first to post in this group.'
              }
            />
          </div>
        ) : (
          <>
            {loadingOlder && (
              <div className="mb-2 flex justify-center">
                <Loader2 className="animate-spin text-muted-foreground" size={16} />
              </div>
            )}
            {!hasMore && !loadingOlder && (
              <div className="mb-3 mt-1 text-center">
                <span className="rounded-full bg-accent/60 px-3 py-1 text-[10px] text-muted-foreground">
                  Start of conversation
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {messages.map((m, idx) => {
                const mine = m.senderId === meId
                const prev = messages[idx - 1]
                const showSender =
                  mode === 'group' && !mine && (idx === 0 || prev?.senderId !== m.senderId)
                // Round 7: resolve the replied-to message (if any) from the
                // local messages array so the bubble can render a quote card.
                // Falls back to null when the original isn't loaded (e.g.
                // older than the current page) — the bubble shows "Original
                // message" placeholder in that case.
                const replyToMessage = m.replyToId
                  ? messages.find((rm) => rm.id === m.replyToId) || null
                  : null
                return (
                  <div key={m.id} data-msg-id={m.id}>
                    <MessageBubble
                      msg={m}
                      mine={mine}
                      isGroup={mode === 'group'}
                      showSender={showSender}
                      meId={meId}
                      searchQuery={searchQuery}
                      onImageClick={(url) => setImagePreview(url)}
                      onReact={toggleReaction}
                      onReply={handleReply}
                      onForward={(msg) => setForwardTarget(msg)}
                      onDelete={(msg) => setDeleteTarget(msg)}
                      onStar={toggleStar}
                      onEdit={(msg) => setEditTarget(msg)}
                      onPin={togglePin}
                      onRemind={(msg) => setRemindTarget(msg)}
                      replyToMessage={replyToMessage}
                      replyPeerName={mode === 'direct' ? peerInfo?.name : undefined}
                      onJumpToMessage={scrollToMessage}
                    />
                  </div>
                )
              })}
              {/* Typing indicator: 1:1 uses peerTyping; groups track a Set of
                  currently-typing userIds (excludes me) and show the sender-
                  aware label "Aria is typing…" or "N people are typing…". */}
              {(peerTyping || (mode === 'group' && groupTypingCount > 0)) && (
                <div className="flex items-center gap-2 pl-1">
                  {mode === 'group' && <div className="w-7 shrink-0" />}
                  <div className="fc-bubble-them fc-rise flex flex-col gap-1 px-3 py-2">
                    {mode === 'group' && groupTypingCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {groupTypingLabel}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <span
                        className="fc-typing-dot h-1.5 w-1.5 rounded-full bg-current"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="fc-typing-dot h-1.5 w-1.5 rounded-full bg-current"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="fc-typing-dot h-1.5 w-1.5 rounded-full bg-current"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Round 7: reply preview bar — shown above the input bar when the user
          is composing a reply. Shows the sender name + truncated content of
          the message being replied to + an X to cancel. Tapping the bar
          (minus the X) scrolls the messages list to the replied-to bubble
          (matches WhatsApp's UX). */}
      {replyTo && (
        <div className="mx-2 mb-1 flex items-center gap-2 rounded-lg border-l-2 border-primary bg-muted/60 px-3 py-2">
          <CornerUpLeft size={16} className="shrink-0 text-primary" />
          <button
            type="button"
            onClick={() => scrollToMessage(replyTo.id)}
            className="flex min-w-0 flex-1 flex-col text-left"
            aria-label="Jump to message being replied to"
          >
            <span className="truncate text-xs font-semibold text-primary">
              {replyTo.senderId === meId
                ? 'You'
                : replyTo.senderName ||
                  (mode === 'direct' ? peerInfo?.name : null) ||
                  'Unknown'}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {replyTo.content ||
                (replyTo.type === 'image'
                  ? '📷 Photo'
                  : replyTo.type === 'video'
                    ? '🎥 Video'
                    : replyTo.type === 'audio'
                      ? '🎤 Audio'
                      : replyTo.fileName || '📄 Document')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* input bar */}
      <div className="border-t border-border bg-background p-2 fc-safe-bottom">
        {recording ? (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
            </span>
            <span className="font-mono text-sm font-medium text-destructive">
              {String(Math.floor(recordSecs / 60)).padStart(2, '0')}:{String(recordSecs % 60).padStart(2, '0')}
            </span>
            <span className="flex-1 text-sm text-muted-foreground">Recording voice note…</span>
            <button
              onClick={() => stopRecording(true)}
              className="grid h-9 w-9 place-items-center rounded-full text-destructive transition hover:bg-destructive/10"
              aria-label="Cancel recording"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => stopRecording(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90"
              aria-label="Send voice note"
            >
              <Send size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <EmojiPicker onPick={(emoji) => setText((t) => t + emoji)} />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) sendFile(f)
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary disabled:opacity-50"
              aria-label="Attach file"
            >
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
            </button>
            {/* Round 8: schedule a message for future delivery. Opens the
                ScheduleMessageDialog with the current draft text prefilled. */}
            <button
              onClick={() => setScheduleDialogOpen(true)}
              disabled={uploading || recording}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary disabled:opacity-50"
              aria-label="Schedule message"
              title="Schedule message"
            >
              <Clock size={20} />
            </button>
            <Textarea
              value={text}
              onChange={handleTextInput}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              rows={1}
              className="min-h-10 max-h-32 flex-1 resize-none rounded-2xl bg-accent/40 px-3 py-2.5 text-sm"
            />
            {text.trim() ? (
              <button
                onClick={sendText}
                disabled={uploading}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={uploading}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/25 disabled:opacity-50"
                aria-label="Record voice note"
              >
                <Mic size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* image preview dialog */}
      <Dialog open={!!imagePreview} onOpenChange={(o) => !o && setImagePreview(null)}>
        <DialogContent
          className="max-w-3xl border-0 bg-black/95 p-2 sm:max-w-3xl"
          showCloseButton
        >
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Image preview"
              className="mx-auto max-h-[85vh] w-auto rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* forward dialog */}
      <ForwardDialog
        message={forwardTarget}
        onClose={() => setForwardTarget(null)}
      />

      {/* delete confirm dialog */}
      <DeleteConfirmDialog
        message={deleteTarget}
        meId={meId}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* edit message dialog */}
      <EditMessageDialog
        message={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
      />

      {/* chat settings sheet (disappearing + wallpaper + starred + scheduled + reminders + export) */}
      <ChatSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        disappearing={disappearing}
        wallpaper={wallpaper}
        onDisappearingChange={handleDisappearingChange}
        onWallpaperChange={handleWallpaperChange}
        onCustomWallpaperUpload={handleCustomWallpaperUpload}
        onOpenStarred={() => setStarredDialogOpen(true)}
        onOpenScheduled={() => setScheduledViewerOpen(true)}
        onOpenReminders={() => setRemindersDialogOpen(true)}
        mode={mode}
        peerId={peerId}
        peerName={peerInfo?.name}
      />

      {/* starred messages viewer */}
      <StarredMessagesDialog
        open={starredDialogOpen}
        onOpenChange={setStarredDialogOpen}
      />

      {/* Round 10: set a reminder for a specific message (datetime-local + optional note) */}
      <RemindMessageDialog
        message={remindTarget}
        onClose={() => setRemindTarget(null)}
      />

      {/* Round 10: reminders viewer — lists all my active message reminders
          across chats with a Cancel button each. */}
      <RemindersDialog
        open={remindersDialogOpen}
        onOpenChange={setRemindersDialogOpen}
      />

      {/* Round 8: schedule a message for future delivery */}
      <ScheduleMessageDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        mode={mode}
        peerId={peerId}
        peerName={peerInfo?.name}
        initialContent={text}
      />

      {/* Round 8: scheduled messages viewer (cancel upcoming messages) */}
      <ScheduledMessagesDialog
        open={scheduledViewerOpen}
        onOpenChange={setScheduledViewerOpen}
        mode={mode}
        peerId={peerId}
      />
    </div>
  )
}

// ---------------- emoji picker ----------------
function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary"
          aria-label="Pick an emoji"
        >
          <Smile size={20} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 p-3">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e, i) => (
            <button
              key={`${e}-${i}`}
              type="button"
              onClick={() => {
                onPick(e)
                setOpen(false)
              }}
              className="grid h-8 w-8 place-items-center rounded-md text-lg transition hover:bg-accent"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------- message bubble ----------------
const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏']

function highlight(text: string, q: string): React.ReactNode[] {
  if (!q.trim()) return linkify(text)
  const lower = text.toLowerCase()
  const ql = q.toLowerCase()
  const nodes: React.ReactNode[] = []
  let i = 0
  let idx = lower.indexOf(ql, i)
  let key = 0
  while (idx !== -1) {
    if (idx > i) nodes.push(<span key={key++}>{text.slice(i, idx)}</span>)
    nodes.push(
      <mark key={key++} className="rounded bg-yellow-300 px-0.5 text-black">
        {text.slice(idx, idx + ql.length)}
      </mark>
    )
    i = idx + ql.length
    idx = lower.indexOf(ql, i)
  }
  if (i < text.length) nodes.push(<span key={key++}>{text.slice(i)}</span>)
  return nodes
}

function MessageBubble({
  msg,
  mine,
  isGroup,
  showSender,
  meId,
  searchQuery,
  onImageClick,
  onReact,
  onReply,
  onForward,
  onDelete,
  onStar,
  onEdit,
  onPin,
  onRemind,
  replyToMessage,
  replyPeerName,
  onJumpToMessage,
}: {
  msg: Message
  mine: boolean
  isGroup: boolean
  showSender: boolean
  meId?: string
  searchQuery?: string
  onImageClick: (url: string) => void
  onReact: (messageId: string, emoji: string) => void
  onReply: (msg: Message) => void
  onForward: (msg: Message) => void
  onDelete: (msg: Message) => void
  onStar: (msg: Message) => void
  onEdit: (msg: Message) => void
  onPin?: (msg: Message) => void
  // Round 10: open the Remind dialog for this message (sets a future
  // reminder that surfaces in the Reminders viewer + will notify the user
  // when remindAt arrives — backend handles the notification trigger).
  onRemind?: (msg: Message) => void
  // Round 7: replied-to message (resolved from the local messages array by
  // the parent). null when the message has no replyToId OR the original
  // isn't loaded — in the latter case the quote card shows a placeholder.
  replyToMessage?: Message | null
  replyPeerName?: string
  onJumpToMessage?: (msgId: string) => void
}) {
  const bubbleClass = mine ? 'fc-bubble-me' : 'fc-bubble-them'
  const [menuOpen, setMenuOpen] = useState(false)
  const [pdfFailed, setPdfFailed] = useState(false)
  const isPdf =
    msg.type === 'document' && !!msg.fileUrl && isPdfMessage(msg) && !pdfFailed
  const isMedia = msg.type === 'image' || msg.type === 'video' || isPdf
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const deleted = isDeletedForMe(msg, meId)
  const forwarded = !!msg.forwardedFrom
  // Edit is only allowed for my own non-deleted text messages within the
  // 15-minute edit window (matches backend rule in /api/messages/[id]/edit).
  const withinEditWindow =
    !!msg.createdAt && (Date.now() - new Date(msg.createdAt).getTime()) / 60000 < 15
  const canEdit = mine && !deleted && msg.type === 'text' && withinEditWindow

  const startPress = () => {
    if (deleted) return
    pressTimer.current = setTimeout(() => setMenuOpen(true), 450)
  }
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const copyContent = (text: string) => {
    if (!text) return
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy'))
  }

  // aggregate reactions: emoji -> { count, mine }
  const reactionAgg = React.useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>()
    for (const r of msg.reactions || []) {
      const cur = map.get(r.emoji) || { count: 0, mine: false }
      cur.count += 1
      if (r.userId === meId) cur.mine = true
      map.set(r.emoji, cur)
    }
    return Array.from(map.entries())
  }, [msg.reactions, meId])

  const meta = (
    <div
      className={cn(
        'mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none',
        mine ? 'opacity-80' : 'opacity-70'
      )}
    >
      <span>{clockTime(msg.createdAt)}</span>
      {msg.edited && (
        <span className="text-[9px] italic text-muted-foreground">edited</span>
      )}
      {mine && <StatusTick status={msg.status} />}
    </div>
  )

  // ---- deleted placeholder (WhatsApp-style) ----
  if (deleted) {
    return (
      <div className={cn('flex w-full gap-2', mine ? 'justify-end' : 'justify-start')}>
        {!mine && isGroup && (
          <div className="mt-1 self-start">
            <UserAvatar name={msg.senderName || 'User'} src={msg.senderPhoto || undefined} size={28} />
          </div>
        )}
        <div className={cn('fc-rise flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
          {!mine && isGroup && showSender && (
            <span className="mb-0.5 px-1 text-xs font-semibold text-primary">
              {msg.senderName || 'Unknown'}
            </span>
          )}
          <div
            className={cn(
              'rounded-2xl bg-muted px-2.5 py-1.5 text-sm italic text-muted-foreground shadow-sm',
              mine ? 'rounded-br-sm' : 'rounded-bl-sm'
            )}
          >
            <p className="whitespace-pre-wrap break-words">🚫 This message was deleted</p>
            <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none opacity-70">
              <span>{clockTime(msg.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex w-full gap-2', mine ? 'justify-end' : 'justify-start')}>
      {!mine && isGroup && (
        <div className="mt-1 self-start">
          <UserAvatar name={msg.senderName || 'User'} src={msg.senderPhoto || undefined} size={28} />
        </div>
      )}
      <div className={cn('fc-rise flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
        {!mine && isGroup && showSender && (
          <span className="mb-0.5 px-1 text-xs font-semibold text-primary">
            {msg.senderName || 'Unknown'}
          </span>
        )}
        {forwarded && (
          <div className="mb-0.5 flex items-center gap-0.5 px-1 text-[10px] italic text-muted-foreground">
            <Forward size={10} /> Forwarded
          </div>
        )}
        <div
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onDoubleClick={() => onReact(msg.id, '❤️')}
          className={cn('relative text-sm shadow-sm', bubbleClass, isMedia ? 'p-1' : 'px-2.5 py-1.5')}
        >
          {/* Round 6: pinned-by-me indicator at top-left of the bubble
              (mirrors the Star indicator at top-right). Only shown when this
              specific message is the one I have pinned in this 1:1 chat. */}
          {msg.pinnedBy === meId && (
            <span
              className="absolute -top-1.5 -left-1.5 z-10 grid h-4 w-4 place-items-center rounded-full bg-card shadow-sm ring-1 ring-border"
              aria-label="Pinned message"
            >
              <Pin size={11} className="text-primary" />
            </span>
          )}
          {msg.starred && (
            <span
              className="absolute -top-1.5 -right-1.5 z-10 grid h-4 w-4 place-items-center rounded-full bg-card shadow-sm ring-1 ring-border"
              aria-label="Starred message"
            >
              <Star size={11} className="fill-primary text-primary" />
            </span>
          )}
          {/* Round 7: reply-with-quote card at the top of the bubble. Shows
              the replied-to message's sender + truncated content. Tappable
              to scroll to the original (uses the parent's scrollToMessage
              helper, exposed via onJumpToMessage). Falls back to "Original
              message" when the original isn't in the local messages array
              (e.g. older than the loaded page) — tap is a no-op in that
              case. If the original was deleted-for-everyone, we mirror the
              "🚫 This message was deleted" placeholder. */}
          {msg.replyToId && (
            <button
              type="button"
              onClick={() => {
                if (replyToMessage && onJumpToMessage) onJumpToMessage(replyToMessage.id)
              }}
              className="mb-1 w-full rounded-r-md border-l-2 border-primary/50 bg-black/5 px-2 py-1 text-left transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              aria-label={
                replyToMessage ? 'Jump to original message' : 'Original message not loaded'
              }
            >
              <div className="text-[11px] font-semibold text-primary">
                {replyToMessage
                  ? replyToMessage.senderId === meId
                    ? 'You'
                    : replyToMessage.senderName ||
                      (!isGroup ? replyPeerName : null) ||
                      'Unknown'
                  : 'Unknown'}
              </div>
              <div className="truncate text-[11px] opacity-70">
                {replyToMessage
                  ? isDeletedForMe(replyToMessage, meId)
                    ? '🚫 This message was deleted'
                    : replyToMessage.content ||
                      (replyToMessage.type === 'image'
                        ? '📷 Photo'
                        : replyToMessage.type === 'video'
                          ? '🎥 Video'
                          : replyToMessage.type === 'audio'
                            ? '🎤 Audio'
                            : replyToMessage.fileName || '📄 Document')
                  : 'Original message'}
              </div>
            </button>
          )}
          {msg.type === 'text' && (
            <>
              <p className="whitespace-pre-wrap break-words">{highlight(msg.content, searchQuery || '')}</p>
              {meta}
            </>
          )}
          {msg.type === 'image' && msg.fileUrl && (
            <>
              <button
                type="button"
                onClick={() => onImageClick(msg.fileUrl!)}
                className="group relative block"
                aria-label={`View image${msg.fileName ? ': ' + msg.fileName : ''}`}
              >
                <img
                  src={msg.fileUrl}
                  alt={msg.fileName || 'image'}
                  className="max-h-72 max-w-[260px] rounded-lg object-cover"
                />
                <span className="pointer-events-none absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
                  <Maximize2 size={12} />
                </span>
              </button>
              <div className="px-1 pb-0.5 pt-1">{meta}</div>
            </>
          )}
          {msg.type === 'video' && msg.fileUrl && (
            <>
              <video
                src={msg.fileUrl}
                controls
                className="max-h-72 max-w-[260px] rounded-lg border border-border bg-black"
              />
              <div className="px-1 pb-0.5 pt-1">{meta}</div>
            </>
          )}
          {msg.type === 'audio' && msg.fileUrl && (
            <>
              <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/20 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/25 text-primary">
                  <Mic size={18} />
                </span>
                <audio
                  src={msg.fileUrl}
                  controls
                  className="h-9 w-48 max-w-full"
                />
              </div>
              {meta}
            </>
          )}
          {msg.type === 'document' && msg.fileUrl && (
            <>
              {isPdf ? (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between gap-2 rounded-t-lg bg-muted/40 px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <FileText size={14} className="shrink-0 text-primary" />
                      <span className="truncate text-xs font-medium" title={msg.fileName || 'document.pdf'}>
                        {msg.fileName || 'document.pdf'}
                      </span>
                      {msg.fileSize ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatBytes(msg.fileSize)}
                        </span>
                      ) : null}
                    </div>
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={msg.fileName || undefined}
                      className="flex shrink-0 items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/25"
                    >
                      <Download size={12} /> Open
                    </a>
                  </div>
                  <iframe
                    src={msg.fileUrl}
                    title={msg.fileName || 'PDF preview'}
                    className="h-96 w-full border-0"
                    onError={() => setPdfFailed(true)}
                  />
                </div>
              ) : (
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={msg.fileName || undefined}
                  className="flex items-center gap-2.5 rounded-lg bg-black/5 px-2.5 py-2 transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{msg.fileName || 'Document'}</div>
                    <div className="text-[10px] opacity-70">{formatBytes(msg.fileSize)}</div>
                  </div>
                  <Download size={16} className="shrink-0 opacity-70" />
                </a>
              )}
              {meta}
            </>
          )}

          {/* action menu: quick reactions row + Reply/Forward/Copy/Delete */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div
                className={cn(
                  'absolute bottom-full z-30 mb-1 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl fc-rise',
                  mine ? 'right-0' : 'left-0'
                )}
              >
                <div className="mb-1 grid grid-cols-6 gap-0.5 border-b border-border px-0.5 pb-1">
                  {QUICK_REACTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => { onReact(msg.id, e); setMenuOpen(false) }}
                      className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-accent"
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { onReply(msg); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-accent"
                >
                  <Reply size={14} className="text-muted-foreground" /> Reply
                </button>
                {/* Round 6: pin/unpin message — only available in 1:1 chats
                    (the backend restricts pinning to direct conversations).
                    Shows "Unpin" if I currently have this message pinned,
                    otherwise "Pin". Pinning a new message automatically
                    unpins the previous one (handled by the backend). */}
                {!isGroup && onPin && (
                  <button
                    onClick={() => { onPin(msg); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-accent"
                  >
                    {msg.pinnedBy === meId ? (
                      <PinOff size={14} className="text-muted-foreground" />
                    ) : (
                      <Pin size={14} className="text-muted-foreground" />
                    )}{' '}
                    {msg.pinnedBy === meId ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => { onEdit(msg); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-accent"
                  >
                    <Pencil size={14} className="text-muted-foreground" /> Edit
                  </button>
                )}
                <button
                  onClick={() => { onForward(msg); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-accent"
                >
                  <Forward size={14} className="text-muted-foreground" /> Forward
                </button>
                <button
                  onClick={() => { onStar(msg); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-accent"
                >
                  <Star
                    size={14}
                    className={cn('text-muted-foreground', msg.starred && 'fill-primary text-primary')}
                  />{' '}
                  {msg.starred ? 'Unstar' : 'Star'}
                </button>
                {/* Round 10: remind me about this message later. Available for
                    all messages (mine + theirs) in both 1:1 and group chats —
                    the backend validates participation. Opens the
                    RemindMessageDialog (datetime-local + optional note) which
                    POSTs /api/messages/[id]/remind { remindAt }. Setting a new
                    reminder on a message that already has one replaces it
                    (backend handles the delete-then-create). */}
                {onRemind && (
                  <button
                    onClick={() => { onRemind(msg); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-accent"
                  >
                    <BellRing size={14} className="text-muted-foreground" /> Remind
                  </button>
                )}
                {msg.content && (
                  <button
                    onClick={() => { copyContent(msg.content); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-accent"
                  >
                    <Copy size={14} className="text-muted-foreground" /> Copy
                  </button>
                )}
                <button
                  onClick={() => { onDelete(msg); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-destructive transition hover:bg-destructive/10"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>

        {/* reaction chips */}
        {reactionAgg.length > 0 && (
          <div className={cn('mt-0.5 flex flex-wrap gap-1', mine ? 'justify-end' : 'justify-start')}>
            {reactionAgg.map(([emoji, info]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition',
                  info.mine
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-card text-foreground hover:bg-accent'
                )}
              >
                <span className="text-sm">{emoji}</span>
                {info.count > 1 && <span className="text-[10px] font-semibold">{info.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------- status tick ----------------
function StatusTick({ status }: { status?: MessageStatus }) {
  if (!status || status === 'SENDING') {
    return <Clock size={12} className="opacity-60" />
  }
  if (status === 'SENT') {
    return <Check size={12} className="opacity-60" />
  }
  if (status === 'DELIVERED') {
    return <CheckCheck size={12} className="opacity-60" />
  }
  if (status === 'SEEN') {
    return <CheckCheck size={12} className="opacity-100" />
  }
  return null
}

// ---------------- forward dialog ----------------
function ForwardDialog({
  message,
  onClose,
}: {
  message: Message | null
  onClose: () => void
}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [groups, setGroups] = useState<GroupLite[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  // Round 10: forward-to-multiple enhancement — search filter for the
  // friend/group list (useful once you have many contacts). Reset on close.
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!message) {
      setSelected(new Set())
      setFriends([])
      setGroups([])
      setSearch('')
      return
    }
    setLoading(true)
    Promise.all([
      api<{ friends: Friend[] }>('/api/friends').catch(() => ({ friends: [] as Friend[] })),
      api<{ groups: GroupLite[] }>('/api/groups').catch(() => ({ groups: [] as GroupLite[] })),
    ])
      .then(([f, g]) => {
        setFriends(f.friends)
        setGroups(g.groups)
      })
      .finally(() => setLoading(false))
  }, [message])

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Round 10: filter the friend/group list by the search query. Matches on
  // name + username for friends, name + description for groups.
  const q = search.trim().toLowerCase()
  const filteredFriends = q
    ? friends.filter(
        (f) =>
          f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
      )
    : friends
  const filteredGroups = q
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description || '').toLowerCase().includes(q)
      )
    : groups

  // Round 10: all visible (post-filter) keys — used by the Select all /
  // Clear all toggle. Empty when no friends/groups match the current search.
  const visibleKeys: string[] = [
    ...filteredGroups.map((g) => `group:${g.id}`),
    ...filteredFriends.map((f) => `user:${f.id}`),
  ]
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selected.has(k))

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      // Clear all visible keys (leaves any non-visible selections intact).
      setSelected((prev) => {
        const next = new Set(prev)
        for (const k of visibleKeys) next.delete(k)
        return next
      })
    } else {
      // Select all visible keys (additive — keeps any existing selections
      // for items outside the current filter).
      setSelected((prev) => {
        const next = new Set(prev)
        for (const k of visibleKeys) next.add(k)
        return next
      })
    }
  }

  const count = selected.size

  const handleForward = async () => {
    if (!message || count === 0) return
    setSending(true)
    try {
      const targets = Array.from(selected).map((key) => {
        const [type, id] = key.split(':')
        return type === 'user' ? { receiverId: id } : { groupId: id }
      })
      const res = await api<{ forwarded: number }>('/api/messages/forward', {
        method: 'POST',
        body: JSON.stringify({ messageId: message.id, targets }),
      })
      toast.success(`Forwarded to ${res.forwarded || targets.length} ${res.forwarded === 1 ? 'chat' : 'chats'}`)
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to forward')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-base">Forward message</DialogTitle>
        </DialogHeader>

        {/* Round 10: search + Select-all toggle — sticky above the list so
            it stays reachable when scrolling through many friends/groups. */}
        {!loading && (friends.length > 0 || groups.length > 0) && (
          <div className="flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends or groups"
                className="rounded-lg border border-border bg-background px-3 py-2 pl-9 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggleAll}
              disabled={visibleKeys.length === 0}
              className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-40"
            >
              {allVisibleSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
        )}

        <div className="fc-scroll max-h-[60vh] overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : friends.length === 0 && groups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No friends or groups available to forward to.
            </div>
          ) : filteredFriends.length === 0 && filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{search.trim()}&rdquo;.
            </div>
          ) : (
            <>
              {filteredGroups.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Groups
                  </div>
                  {filteredGroups.map((g) => {
                    const key = `group:${g.id}`
                    const checked = selected.has(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-accent"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(key)} />
                        {g.photoUrl ? (
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                            <img src={g.photoUrl} alt={g.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-border">
                            <Users size={16} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{g.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {filteredFriends.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Friends
                  </div>
                  {filteredFriends.map((f) => {
                    const key = `user:${f.id}`
                    const checked = selected.has(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-accent"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(key)} />
                        <UserAvatar name={f.name} src={f.photoUrl} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{f.name}</div>
                          <div className="text-[11px] text-muted-foreground">@{f.username}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border px-4 py-3 sm:justify-between">
          {/* Round 10: count badge with primary-tinted styling — gives the
              user clear feedback on how many recipients are currently
              selected. Replaces the plain text label. */}
          {count > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              <Check size={11} />
              {count} selected
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Select recipients</span>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleForward} disabled={count === 0 || sending}>
              {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Forward to {count}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- chat settings sheet ----------------
const WALLPAPER_PRESETS: { id: string; label: string; value: string }[] = [
  { id: 'none', label: 'None', value: '' },
  { id: 'emerald', label: 'Emerald', value: '#f0fdf4' },
  { id: 'teal', label: 'Teal', value: 'linear-gradient(135deg, #ccfbf1, #f0fdfa)' },
  { id: 'sand', label: 'Sand', value: 'linear-gradient(135deg, #fef3c7, #fde68a)' },
  { id: 'rose', label: 'Rose', value: 'linear-gradient(135deg, #ffe4e6, #fecdd3)' },
  { id: 'amber', label: 'Amber', value: 'linear-gradient(135deg, #fef9c3, #fde68a)' },
  { id: 'slate', label: 'Slate', value: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' },
  { id: 'charcoal', label: 'Charcoal', value: '#1f2937' },
]

function ChatSettingsSheet({
  open,
  onOpenChange,
  disappearing,
  wallpaper,
  onDisappearingChange,
  onWallpaperChange,
  onCustomWallpaperUpload,
  onOpenStarred,
  onOpenScheduled,
  onOpenReminders,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  disappearing: 'OFF' | '24H' | '7D'
  wallpaper: string | null
  onDisappearingChange: (v: 'OFF' | '24H' | '7D') => void
  onWallpaperChange: (v: string) => void
  onCustomWallpaperUpload?: (file: File) => Promise<void>
  onOpenStarred: () => void
  // Round 8: opens the ScheduledMessagesDialog (lists scheduled messages
  // for this conversation + supports cancellation).
  onOpenScheduled: () => void
  // Round 10: opens the RemindersDialog (lists active message reminders
  // across all chats + supports cancellation).
  onOpenReminders: () => void
  // Round 9: chat export — `mode` + `peerId` build the export URL
  // (?userId= for direct, ?groupId= for group). `peerName` is used for
  // the downloaded filename.
  mode: 'direct' | 'group'
  peerId: string
  peerName?: string
}) {
  const disappearingOptions: { value: 'OFF' | '24H' | '7D'; label: string; description: string }[] = [
    { value: 'OFF', label: 'Off', description: 'Messages stay in the chat' },
    { value: '24H', label: '24 hours', description: 'Messages vanish after a day' },
    { value: '7D', label: '7 days', description: 'Messages vanish after a week' },
  ]

  const [uploading, setUploading] = useState(false)
  // Round 9: which export format is currently in flight (null = idle).
  // Disables both buttons while a download is being prepared.
  const [exporting, setExporting] = useState<'json' | 'txt' | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // True when the active wallpaper is a custom-uploaded image (url('...') value).
  const isCustomWallpaper = !!wallpaper && /^url\(/i.test(wallpaper)

  // Round 9: triggers a chat export download. Both formats are fetched as a
  // Blob (so we can detect errors and surface them via toast) and then
  // downloaded via a temporary <a download> element. The backend sets
  // content-disposition for txt, but using a Blob gives us a consistent
  // client-side filename and lets us show success/error toasts.
  const handleExport = async (format: 'json' | 'txt') => {
    if (exporting) return
    setExporting(format)
    const toastId = 'chat-export'
    toast.loading('Exporting chat…', { id: toastId })
    try {
      const q =
        mode === 'direct'
          ? `userId=${encodeURIComponent(peerId)}`
          : `groupId=${encodeURIComponent(peerId)}`
      const url = `/api/messages/export?${q}&format=${format}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        let msg = `Export failed (${res.status})`
        try {
          const d = await res.json()
          msg = d?.error || msg
        } catch {
          /* ignore JSON parse error */
        }
        throw new Error(msg)
      }
      const safeName =
        (peerName || 'chat')
          .replace(/[^a-z0-9]/gi, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '') || 'chat'
      const blob =
        format === 'txt'
          ? await res.blob()
          : new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' })
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `${safeName}_chat.${format === 'txt' ? 'txt' : 'json'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
      toast.success('Chat exported', { id: toastId })
    } catch (e: any) {
      toast.error(e?.message || 'Export failed', { id: toastId })
    } finally {
      setExporting(null)
    }
  }

  const handleCustomPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Always clear the input value so the same file can be re-selected later.
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    if (!onCustomWallpaperUpload) return
    setUploading(true)
    onCustomWallpaperUpload(file)
      .then(() => {
        // Close the sheet on success — wallpaper is already applied to the chat.
        onOpenChange(false)
      })
      .catch(() => {
        /* error toast already shown by the parent handler */
      })
      .finally(() => setUploading(false))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl rounded-t-2xl p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-base">Chat settings</SheetTitle>
        </SheetHeader>
        <div className="fc-scroll max-h-[80vh] overflow-y-auto px-4 py-4">
          {/* Starred messages */}
          <section className="mb-6">
            <SectionTitle>Starred</SectionTitle>
            <button
              type="button"
              onClick={() => {
                onOpenStarred()
                onOpenChange(false)
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-accent"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Star size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Starred messages</div>
                <div className="text-[11px] text-muted-foreground">
                  View all messages you&rsquo;ve starred across chats
                </div>
              </div>
            </button>
          </section>

          {/* Round 8: Scheduled messages — opens the ScheduledMessagesDialog
              which lists upcoming scheduled messages for THIS conversation
              (filtered by receiverId/groupId) with a Cancel button each. */}
          <section className="mb-6">
            <SectionTitle>Scheduled</SectionTitle>
            <button
              type="button"
              onClick={() => {
                onOpenScheduled()
                onOpenChange(false)
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-accent"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Clock size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Scheduled messages</div>
                <div className="text-[11px] text-muted-foreground">
                  View + cancel messages scheduled for later in this chat
                </div>
              </div>
            </button>
          </section>

          {/* Round 10: Message reminders — opens the RemindersDialog which
              lists all my active message reminders across every chat (with
              the originating message content + peer name + remind time) and
              supports cancellation. */}
          <section className="mb-6">
            <SectionTitle>Reminders</SectionTitle>
            <button
              type="button"
              onClick={() => {
                onOpenReminders()
                onOpenChange(false)
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-accent"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <BellRing size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Message reminders</div>
                <div className="text-[11px] text-muted-foreground">
                  View + cancel reminders you set on messages
                </div>
              </div>
            </button>
          </section>

          {/* Round 9: Export chat — downloads a JSON or TXT transcript via
              /api/messages/export. The backend already filters out scheduled
              + deleted-for-everyone messages and sets content-disposition for
              txt; we wrap the request so we can surface errors via toast and
              use a consistent client-side filename. */}
          <section className="mb-6">
            <SectionTitle>Export</SectionTitle>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Download size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Export chat</div>
                <div className="text-[11px] text-muted-foreground">
                  Download a copy of this conversation
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={exporting !== null}
                  onClick={() => handleExport('txt')}
                  className="h-8 gap-1 px-2.5"
                >
                  {exporting === 'txt' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <FileText size={12} />
                  )}
                  TXT
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={exporting !== null}
                  onClick={() => handleExport('json')}
                  className="h-8 gap-1 px-2.5"
                >
                  {exporting === 'json' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <FileJson size={12} />
                  )}
                  JSON
                </Button>
              </div>
            </div>
          </section>

          {/* Disappearing messages */}
          <section className="mb-6">
            <SectionTitle>Disappearing messages</SectionTitle>
            <RadioGroup
              value={disappearing}
              onValueChange={(v) => onDisappearingChange(v as 'OFF' | '24H' | '7D')}
              className="mt-2 gap-1.5"
            >
              {disappearingOptions.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`dis-${opt.value}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition',
                    disappearing === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <RadioGroupItem id={`dis-${opt.value}`} value={opt.value} />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {opt.value !== 'OFF' && (
                      <Timer size={14} className="shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">{opt.label}</div>
                      <div className="text-[11px] leading-tight text-muted-foreground">
                        {opt.description}
                      </div>
                    </div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </section>

          {/* Wallpaper */}
          <section>
            <SectionTitle>Wallpaper</SectionTitle>
            <div className="mt-2 grid grid-cols-4 gap-2.5">
              {WALLPAPER_PRESETS.map((wp) => {
                const selected = (wallpaper || '') === wp.value
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => onWallpaperChange(wp.value)}
                    aria-label={wp.label}
                    aria-pressed={selected}
                    title={wp.label}
                    className={cn(
                      'relative aspect-[2/5] rounded-xl ring-2 transition',
                      selected ? 'ring-primary' : 'ring-transparent hover:ring-border'
                    )}
                    style={wp.value === '' ? undefined : { background: wp.value }}
                  >
                    {wp.value === '' && (
                      <div className="absolute inset-0 grid place-items-center rounded-xl bg-card">
                        <X size={14} className="text-muted-foreground" />
                      </div>
                    )}
                    {selected && (
                      <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Check size={10} />
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Custom wallpaper upload tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !onCustomWallpaperUpload}
                aria-label="Upload custom wallpaper"
                aria-pressed={isCustomWallpaper}
                title="Upload custom wallpaper"
                className={cn(
                  'relative aspect-[2/5] rounded-xl bg-muted ring-2 transition',
                  isCustomWallpaper
                    ? 'ring-primary'
                    : 'ring-transparent hover:ring-border',
                  (uploading || !onCustomWallpaperUpload) && 'cursor-not-allowed opacity-70'
                )}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center">
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  ) : (
                    <ImageIcon size={16} className="text-muted-foreground" />
                  )}
                  <span className="text-[9px] font-medium leading-tight text-muted-foreground">
                    {uploading ? 'Uploading…' : 'Custom'}
                  </span>
                </div>
                {isCustomWallpaper && (
                  <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check size={10} />
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomPick}
                disabled={uploading}
              />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------- starred messages dialog ----------------
interface StarredMessage {
  id: string
  senderId: string
  senderName: string
  senderUsername?: string
  senderPhoto?: string | null
  content: string
  type: string
  fileUrl?: string | null
  fileName?: string | null
  createdAt: string
  starredAt: string
  receiverId?: string | null
  groupId?: string | null
  deletedFor?: string
}

function StarredMessagesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { user: me } = useAuth()
  const meId = me?.id
  const [loading, setLoading] = useState(false)
  const [starred, setStarred] = useState<StarredMessage[]>([])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api<{ starred: StarredMessage[] }>('/api/messages/starred')
      .then((d) => setStarred(d.starred || []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load starred'))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Star size={16} className="fill-primary text-primary" />
            Starred messages
          </DialogTitle>
        </DialogHeader>
        <div className="fc-scroll max-h-[70vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : starred.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No starred messages
            </div>
          ) : (
            <div className="space-y-0.5">
              {starred.map((m) => {
                const deletedAll = m.deletedFor === 'everyone'
                const deletedForMe = (() => {
                  if (!meId || !m.deletedFor) return false
                  if (m.deletedFor === 'everyone') return true
                  return String(m.deletedFor)
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .includes(meId)
                })()
                const isDeleted = deletedAll || deletedForMe
                let icon: React.ReactNode = null
                if (!isDeleted) {
                  if (m.type === 'image') icon = <span className="text-base">📷</span>
                  else if (m.type === 'video') icon = <span className="text-base">🎥</span>
                  else if (m.type === 'audio') icon = <span className="text-base">🎤</span>
                  else if (m.type === 'document') icon = <span className="text-base">📄</span>
                }
                const preview = isDeleted
                  ? '🚫 This message was deleted'
                  : m.content || m.fileName || (icon ? 'Media message' : '')
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-accent"
                  >
                    <UserAvatar
                      name={m.senderName || 'User'}
                      src={m.senderPhoto || undefined}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {m.senderName || 'Unknown'}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(m.starredAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {icon}
                        <span className={cn('truncate', isDeleted && 'italic')}>{preview}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- delete confirm dialog ----------------
function DeleteConfirmDialog({
  message,
  meId,
  onClose,
  onConfirm,
}: {
  message: Message | null
  meId?: string
  onClose: () => void
  onConfirm: (msg: Message, scope: 'me' | 'everyone') => void
}) {
  const canDeleteForEveryone = !!(
    message &&
    meId &&
    message.senderId === meId &&
    !isDeletedForMe(message, meId)
  )

  return (
    <AlertDialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete message?</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you want to delete this message. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            disabled={!canDeleteForEveryone}
            onClick={() => message && onConfirm(message, 'everyone')}
            className="bg-destructive text-white shadow-xs hover:bg-destructive/90 disabled:opacity-40"
          >
            <Trash2 size={14} /> Delete for everyone
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => message && onConfirm(message, 'me')}
            className="border border-border bg-background text-foreground shadow-xs hover:bg-accent"
          >
            Delete for me
          </AlertDialogAction>
          <AlertDialogCancel className="mt-1">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---------------- edit message dialog ----------------
function EditMessageDialog({
  message,
  onClose,
  onSave,
}: {
  message: Message | null
  onClose: () => void
  onSave: (msg: Message, content: string) => Promise<void>
}) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (message) {
      // Prefill with the current message content + reset saving state.
      setContent(message.content)
      setSaving(false)
    }
  }, [message])

  const trimmed = content.trim()
  const canSave =
    !!message && trimmed.length > 0 && trimmed !== message.content.trim() && !saving

  const handleSave = async () => {
    if (!message || !canSave) return
    setSaving(true)
    try {
      await onSave(message, trimmed)
      // Close on success — the parent already toasts + updates local state.
      onClose()
    } catch (e: any) {
      // Surface server errors (e.g. "edit window expired", "forbidden") to the
      // user via toast; keep the dialog open so they can adjust + retry.
      toast.error(e?.message || 'Failed to edit message')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil size={16} className="text-primary" />
            Edit message
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 py-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            maxLength={5000}
            rows={4}
            className="resize-none"
            placeholder="Edit your message…"
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter to save (Enter still inserts newline in edit mode
              // — different from the send box, since editing is a deliberate
              // multi-line affordance).
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSave()
              }
            }}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Press Ctrl+Enter to save</span>
            <span>{content.length} / 5000</span>
          </div>
        </div>
        <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-border px-4 py-3 sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Round 8: schedule message dialog ----------------
// Composer for scheduling a message for future delivery. The Textarea is
// prefilled with the current draft text (passed via `initialContent`) so the
// user can convert a half-typed message into a scheduled one. The datetime-
// local input defaults to one hour from now. The Schedule button is disabled
// until the content is non-empty AND scheduledFor is a valid future timestamp.
//
// Backend: POST /api/messages/scheduled { content, scheduledFor, receiverId |
// groupId } — the message is stored with scheduledFor in the future + NOT
// delivered immediately. A future cron enhancement will emit message:new when
// the scheduled time arrives (not yet implemented — for now they're stored +
// listed + cancellable).
function ScheduleMessageDialog({
  open,
  onOpenChange,
  mode,
  peerId,
  peerName,
  initialContent,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'direct' | 'group'
  peerId: string
  peerName?: string
  initialContent?: string
}) {
  const [content, setContent] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [sending, setSending] = useState(false)

  // Prefill the content with the draft text + reset the time picker to one
  // hour from now whenever the dialog opens. We intentionally depend on
  // `open` only — re-running on `initialContent` changes would clobber the
  // user's in-progress edits if the parent re-renders for an unrelated reason
  // (the dialog is modal so initialContent can't actually change while open).
  useEffect(() => {
    if (open) {
      setContent(initialContent || '')
      const soon = new Date(Date.now() + 60 * 60 * 1000)
      setScheduledFor(toLocalDateTimeInput(soon))
      setSending(false)
    }
  }, [open, initialContent])

  const trimmed = content.trim()
  const scheduledDate = scheduledFor ? new Date(scheduledFor) : null
  const isFuture =
    !!scheduledDate &&
    !isNaN(scheduledDate.getTime()) &&
    scheduledDate.getTime() > Date.now()
  const canSubmit = !!trimmed && isFuture && !sending

  const handleSubmit = async () => {
    if (!canSubmit || !scheduledDate) return
    setSending(true)
    try {
      const body: { content: string; scheduledFor: string; receiverId?: string; groupId?: string } = {
        content: trimmed,
        scheduledFor: scheduledDate.toISOString(),
      }
      if (mode === 'direct') body.receiverId = peerId
      else body.groupId = peerId
      await api<{ message: { id: string; scheduledFor: string } }>(
        '/api/messages/scheduled',
        { method: 'POST', body: JSON.stringify(body) }
      )
      toast.success(`Message scheduled for ${formatScheduledTime(scheduledDate.toISOString())}`)
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to schedule message')
    } finally {
      setSending(false)
    }
  }

  const targetLabel = peerName || (mode === 'group' ? 'this group' : 'this contact')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock size={16} className="text-primary" />
            Schedule message
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 py-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            maxLength={5000}
            rows={4}
            className="resize-none"
            placeholder="Message to send later…"
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter submits (matches the EditMessageDialog pattern).
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <label className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              Send at
            </span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={toLocalDateTimeInput(new Date())}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              To: <span className="font-medium text-foreground">{targetLabel}</span>
            </span>
            <span>{content.length} / 5000</span>
          </div>
          {scheduledFor && !isFuture && (
            <p className="mt-1.5 text-[11px] text-destructive">
              Pick a time in the future.
            </p>
          )}
        </div>
        <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-border px-4 py-3 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {sending ? <Loader2 className="animate-spin" size={14} /> : <Clock size={14} />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Round 8: scheduled messages dialog ----------------
// Lists scheduled messages for the CURRENT conversation only (filtered from
// the global /api/messages/scheduled response by receiverId === peerId for
// 1:1 or groupId === peerId for groups). Each row shows the truncated
// content + the formatted scheduled time + a destructive Cancel button that
// DELETEs the scheduled message via /api/messages/scheduled?id=MSG_ID.
//
// Note: the backend stores scheduled messages with status=SENT +
// scheduledFor in the future. The GET /api/messages endpoint already filters
// them out (they don't appear in normal history until their time arrives).
// A future cron enhancement will emit message:new when the scheduled time
// arrives — for now they're stored + listed + cancellable.
interface ScheduledMessageLite {
  id: string
  content: string
  type: string
  scheduledFor: string
  receiverId?: string | null
  receiverName?: string | null
  groupId?: string | null
  groupName?: string | null
}

function ScheduledMessagesDialog({
  open,
  onOpenChange,
  mode,
  peerId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'direct' | 'group'
  peerId: string
}) {
  const [loading, setLoading] = useState(false)
  const [scheduled, setScheduled] = useState<ScheduledMessageLite[]>([])
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Filter the global scheduled list down to messages targeted at THIS
  // conversation. The backend returns all of the user's scheduled messages
  // (across every chat); we narrow it client-side so the dialog stays
  // focused on the active chat.
  const filtered = scheduled.filter((m) =>
    mode === 'direct' ? m.receiverId === peerId : m.groupId === peerId
  )

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api<{ scheduled: ScheduledMessageLite[] }>('/api/messages/scheduled')
      .then((d) => setScheduled(d.scheduled || []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load scheduled messages'))
      .finally(() => setLoading(false))
  }, [open])

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    try {
      await api(`/api/messages/scheduled?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setScheduled((prev) => prev.filter((m) => m.id !== id))
      toast.success('Scheduled message cancelled')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock size={16} className="text-primary" />
            Scheduled messages
          </DialogTitle>
        </DialogHeader>
        <div className="fc-scroll max-h-[70vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No scheduled messages for this {mode === 'direct' ? 'chat' : 'group'}.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl p-2 hover:bg-accent/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 break-words text-sm">
                        {m.content || '(empty message)'}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar size={10} />
                        <span>{formatScheduledTime(m.scheduledFor)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancel(m.id)}
                      disabled={cancellingId === m.id}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                      aria-label="Cancel scheduled message"
                    >
                      {cancellingId === m.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Round 10: remind-message dialog ----------------
// Composer for setting a per-message reminder. The datetime-local input is
// constrained to future values (backend rejects past/now). An optional note
// field lets the user type a reason ("why am I setting this?") — the backend
// schema doesn't persist a note, so we POST only `remindAt` per the API
// contract; the note is local UI affordance only (kept in component state,
// shown in the dialog footer hint while composing).
//
// Backend: POST /api/messages/[id]/remind { remindAt } →
// { reminder: { id, remindAt } }. Validates participation + future date.
// Setting a new reminder on a message that already has one replaces it
// (backend deleteMany-then-create).
function RemindMessageDialog({
  message,
  onClose,
}: {
  message: Message | null
  onClose: () => void
}) {
  const [remindAt, setRemindAt] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset the form whenever a new message target is set (or the dialog
  // closes). Default the time picker to one hour from now so the user can
  // confirm with one tap for a quick reminder.
  useEffect(() => {
    if (message) {
      const soon = new Date(Date.now() + 60 * 60 * 1000)
      setRemindAt(toLocalDateTimeInput(soon))
      setNote('')
      setSaving(false)
    }
  }, [message])

  const remindDate = remindAt ? new Date(remindAt) : null
  const isFuture =
    !!remindDate &&
    !isNaN(remindDate.getTime()) &&
    remindDate.getTime() > Date.now()
  const canSubmit = !!message && isFuture && !saving

  const handleSubmit = async () => {
    if (!canSubmit || !message || !remindDate) return
    setSaving(true)
    try {
      await api<{ reminder: { id: string; remindAt: string } }>(
        `/api/messages/${message.id}/remind`,
        {
          method: 'POST',
          body: JSON.stringify({ remindAt: remindDate.toISOString() }),
        }
      )
      toast.success(`Reminder set for ${formatScheduledTime(remindDate.toISOString())}`)
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to set reminder')
    } finally {
      setSaving(false)
    }
  }

  // Build a short preview of the target message so the user can confirm
  // they're setting a reminder on the right bubble.
  const messagePreview = message
    ? message.content ||
      (message.type === 'image'
        ? '📷 Photo'
        : message.type === 'video'
          ? '🎥 Video'
          : message.type === 'audio'
            ? '🎤 Audio'
            : message.fileName || '📄 Document')
    : ''

  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BellRing size={16} className="text-primary" />
            Remind me
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 py-3">
          {/* Target message preview (truncated, read-only) */}
          {message && (
            <div className="mb-3 rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2">
              <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                {messagePreview}
              </div>
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              Remind me at
            </span>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              min={toLocalDateTimeInput(new Date())}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Bell size={12} />
              Note (optional)
            </span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Why are you setting this reminder?"
            />
            <span className="self-end text-[10px] text-muted-foreground">
              {note.length} / 200
            </span>
          </label>
          {remindAt && !isFuture && (
            <p className="mt-1.5 text-[11px] text-destructive">
              Pick a time in the future.
            </p>
          )}
        </div>
        <DialogFooter className="flex-row items-center justify-end gap-2 border-t border-border px-4 py-3 sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <BellRing size={14} />}
            Set reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Round 10: reminders dialog (viewer) ----------------
// Lists ALL my active message reminders across every chat (fetched from
// GET /api/messages/reminders — backend returns future + not-notified
// reminders with the originating message content + peer context). Each row
// shows a Bell icon, the message content (line-clamp-2), the peer name, a
// Calendar icon + formatted remind time, and a destructive Cancel button
// that DELETEs the reminder via /api/messages/[messageId]/remind and removes
// it from the list.
function RemindersDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [reminders, setReminders] = useState<MessageReminderLite[]>([])
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api<{ reminders: MessageReminderLite[] }>('/api/messages/reminders')
      .then((d) => setReminders(d.reminders || []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load reminders'))
      .finally(() => setLoading(false))
  }, [open])

  const handleCancel = async (reminder: MessageReminderLite) => {
    setCancellingId(reminder.id)
    try {
      await api(`/api/messages/${reminder.messageId}/remind`, { method: 'DELETE' })
      setReminders((prev) => prev.filter((r) => r.id !== reminder.id))
      toast.success('Reminder cancelled')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel reminder')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BellRing size={16} className="text-primary" />
            Message reminders
          </DialogTitle>
        </DialogHeader>
        <div className="fc-scroll max-h-[70vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : reminders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No active reminders. Long-press a message and tap{' '}
              <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                <BellRing size={11} /> Remind
              </span>{' '}
              to set one.
            </div>
          ) : (
            <div className="space-y-0.5">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl p-2 hover:bg-accent/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Bell size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 break-words text-sm">
                        {r.content || (
                          r.type === 'image'
                            ? '📷 Photo'
                            : r.type === 'video'
                              ? '🎥 Video'
                              : r.type === 'audio'
                                ? '🎤 Audio'
                                : '📄 Document'
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="truncate">with {r.peerName || 'Unknown'}</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Calendar size={10} />
                          {formatScheduledTime(r.remindAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancel(r)}
                      disabled={cancellingId === r.id}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                      aria-label="Cancel reminder"
                    >
                      {cancellingId === r.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={12} />
                      )}
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
