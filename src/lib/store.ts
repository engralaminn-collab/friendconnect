'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type View =
  | 'splash'
  | 'welcome'
  | 'login'
  | 'register'
  | 'forgot'
  | 'home'
  | 'friends'
  | 'chat'
  | 'groups'
  | 'calls'
  | 'profile'
  | 'settings'
  | 'notifications'

interface AppState {
  view: View
  setView: (v: View) => void

  // contextual ids
  activeChatUserId: string | null
  activeChatGroupId: string | null
  activeProfileId: string | null // for viewing other profiles
  openChat: (userId: string) => void
  openGroupChat: (groupId: string) => void
  openProfile: (userId: string) => void

  // theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (t: 'light' | 'dark' | 'system') => void

  // hydrated flag
  hydrated: boolean
  setHydrated: (b: boolean) => void
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      view: 'splash',
      setView: (v) => set({ view: v }),

      activeChatUserId: null,
      activeChatGroupId: null,
      activeProfileId: null,
      openChat: (userId) => set({ activeChatUserId: userId, activeChatGroupId: null, view: 'chat' }),
      openGroupChat: (groupId) => set({ activeChatGroupId: groupId, activeChatUserId: null, view: 'chat' }),
      openProfile: (userId) => set({ activeProfileId: userId, view: 'profile' }),

      theme: 'system',
      setTheme: (t) => set({ theme: t }),

      hydrated: false,
      setHydrated: (b) => set({ hydrated: b }),
    }),
    {
      name: 'fc-app',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
)
