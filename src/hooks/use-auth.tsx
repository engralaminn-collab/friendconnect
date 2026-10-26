'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'

export interface ProfileData {
  photoUrl: string | null
  bio: string | null
  phone: string | null
  location: string | null
  birthday: string | null
  education: string | null
  work: string | null
  profileVisibility: string
  messagePermission: string
  callPermission: string
  readReceipts: boolean
  photoFilter: string | null
  verified: string
  lastSeen: string | null
}

export interface AuthUser {
  id: string
  email: string
  username: string
  name: string
  role: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  fileQuota: { used: number; quota: number } | null
  profile: ProfileData | null
}

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<AuthUser | null>
  setUser: (u: AuthUser | null) => void
  login: (identifier: string, password: string) => Promise<void>
  register: (data: { name: string; username: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: AuthUser | null }>('/api/auth/me')
      setUser(data.user)
      return data.user
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await api<{ user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, password }),
    })
    await refresh()
  }, [refresh])

  const register = useCallback(async (input: { name: string; username: string; email: string; password: string }) => {
    await api('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })
    await refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  return (
    <Ctx.Provider value={{ user, loading, refresh, setUser, login, register, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
