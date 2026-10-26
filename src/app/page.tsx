'use client'

import { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { SocketProvider } from '@/hooks/use-socket'
import { NotificationsProvider } from '@/hooks/use-notifications'
import { useApp } from '@/lib/store'
import { TopBar, BottomNav } from '@/components/fc/shell/nav'
import { AuthFlow } from '@/components/fc/auth/AuthFlow'
import { HomeView } from '@/components/fc/home/HomeView'
import { FriendsView } from '@/components/fc/friends/FriendsView'
import { ProfileView } from '@/components/fc/profile/ProfileView'
import { ChatView } from '@/components/fc/chat/ChatView'
import { CallsView } from '@/components/fc/calls/CallsView'
import { GroupsView } from '@/components/fc/groups/GroupsView'
import { NotificationsView } from '@/components/fc/notifications/NotificationsView'
import { SettingsView } from '@/components/fc/settings/SettingsView'
import { CallOverlay } from '@/components/fc/calls/CallOverlay'
import { FCLogo } from '@/components/fc/ui'

function AuthedApp() {
  const { view } = useApp()
  return (
    <SocketProvider>
      <NotificationsProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <TopBar />
          <main className="mx-auto w-full max-w-2xl flex-1 overflow-hidden">
            {view === 'home' && <HomeView />}
            {view === 'friends' && <FriendsView />}
            {view === 'chat' && <ChatView />}
            {view === 'calls' && <CallsView />}
            {view === 'groups' && <GroupsView />}
            {view === 'notifications' && <NotificationsView />}
            {view === 'settings' && <SettingsView />}
            {view === 'profile' && <ProfileView />}
          </main>
          <BottomNav />
          <CallOverlay />
        </div>
      </NotificationsProvider>
    </SocketProvider>
  )
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="fc-pulse">
        <FCLogo size={72} />
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold tracking-tight">FriendConnect</div>
        <div className="text-sm text-muted-foreground">Reconnecting old friends, privately.</div>
      </div>
    </div>
  )
}

function Root() {
  const { user, loading } = useAuth()
  const { view, setView } = useApp()

  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => {
      if (view === 'splash') setView(user ? 'home' : 'welcome')
    }, 700)
    return () => clearTimeout(t)
  }, [loading, user, view, setView])

  if (loading) return <Splash />
  if (!user) return <AuthFlow />
  return <AuthedApp />
}

export default function Home() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
