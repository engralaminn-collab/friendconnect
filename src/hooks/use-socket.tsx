'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { RT } from '@/lib/constants'
import { useAuth } from '@/hooks/use-auth'

interface SocketCtx {
  socket: Socket | null
  connected: boolean
  online: Set<string>
  isOnline: (userId: string) => boolean
}

const Ctx = createContext<SocketCtx | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [online, setOnline] = useState<Set<string>>(new Set())
  const tokenRef = useRef<string | null>(null)
  const authedRef = useRef(false)

  useEffect(() => {
    if (!user) {
      // disconnect if logged out
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setConnected(false)
        setOnline(new Set())
        authedRef.current = false
      }
      return
    }
    const s = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      timeout: 12000,
      withCredentials: true,
    })
    setSocket(s)

    s.on('connect', async () => {
      setConnected(true)
      // cookie auth usually already set userId via middleware; send explicit auth as fallback
      try {
        if (!authedRef.current) {
          const res = await fetch('/api/auth/token', { credentials: 'include' })
          if (res.ok) {
            const { token } = await res.json()
            tokenRef.current = token
            s.emit(RT.AUTH, { token }, (ack: any) => {
              if (ack?.ok) authedRef.current = true
            })
          } else {
            authedRef.current = true // assume cookie auth worked
          }
        }
      } catch {
        authedRef.current = true
      }
    })

    s.on('disconnect', () => {
      setConnected(false)
    })

    s.on('reconnect', () => {
      setConnected(true)
      authedRef.current = false
    })

    s.on('presence', ({ userId, online: isOn }: { userId: string; online: boolean }) => {
      setOnline((prev) => {
        const next = new Set(prev)
        if (isOn) next.add(userId)
        else next.delete(userId)
        return next
      })
    })

    return () => {
      s.disconnect()
      setSocket(null)
      setConnected(false)
      authedRef.current = false
    }
  }, [user?.id])

  const isOnline = useCallback((userId: string) => online.has(userId), [online])

  return <Ctx.Provider value={{ socket, connected, online, isOnline }}>{children}</Ctx.Provider>
}

export function useSocket() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
