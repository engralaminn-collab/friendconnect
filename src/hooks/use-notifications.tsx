'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { useSocket } from '@/hooks/use-socket'
import { RT } from '@/lib/constants'

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  data: any
  read: boolean
  createdAt: string
}

interface NotifCtx {
  unread: number
  notifications: NotificationItem[]
  refresh: () => Promise<void>
  markAllRead: () => Promise<void>
}

const Ctx = createContext<NotifCtx | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setUnread(0)
      setNotifications([])
      return
    }
    try {
      const data = await api<{ unread: number; notifications: NotificationItem[] }>('/api/notifications')
      setUnread(data.unread)
      setNotifications(data.notifications)
    } catch {}
  }, [user])

  useEffect(() => {
    if (!user) return
    void refresh()
    timer.current = setInterval(refresh, 12000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [user, refresh])

  // realtime ping: when a notification event arrives, refresh
  useEffect(() => {
    if (!socket) return
    const handler = () => refresh()
    socket.on(RT.NOTIFICATION, handler)
    socket.on(RT.CALL_INCOMING, handler)
    return () => {
      socket.off(RT.NOTIFICATION, handler)
      socket.off(RT.CALL_INCOMING, handler)
    }
  }, [socket, refresh])

  const markAllRead = useCallback(async () => {
    await api('/api/notifications', { method: 'POST', body: JSON.stringify({ all: true }) })
    setUnread(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  return <Ctx.Provider value={{ unread, notifications, refresh, markAllRead }}>{children}</Ctx.Provider>
}

export function useNotifications() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
