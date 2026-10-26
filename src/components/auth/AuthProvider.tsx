"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/resources";
import { ApiClientError } from "@/lib/api/client";
import type { PublicUser } from "@/lib/api/types";
import { getSocket, disconnectSocket, onConnectionChange } from "@/lib/realtime/socket";
import { runLocalMigration } from "@/lib/api/local-migration";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: PublicUser) => void;
  realtimeConnected: boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = React.useState<PublicUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [realtimeConnected, setRealtimeConnected] = React.useState(false);
  const router = useRouter();

  const refresh = React.useCallback(async () => {
    try {
      const { user } = await authApi.session();
      setUserState(user);
      if (user) {
        getSocket();
        void runLocalMigration().catch(() => undefined);
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) setUserState(null);
    }
  }, []);

  React.useEffect(() => {
    void refresh().finally(() => setLoading(false));
    return onConnectionChange(setRealtimeConnected);
  }, [refresh]);

  const login = React.useCallback(async (email: string, password: string) => {
    const { user } = await authApi.login({ email, password });
    setUserState(user);
    getSocket();
    await runLocalMigration().catch(() => undefined);
  }, []);

  const register = React.useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      await authApi.register(input);
      const { user } = await authApi.session();
      setUserState(user);
      getSocket();
      await runLocalMigration().catch(() => undefined);
    },
    [],
  );

  const logout = React.useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    disconnectSocket();
    setUserState(null);
    router.push("/login");
  }, [router]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      setUser: setUserState,
      realtimeConnected,
    }),
    [user, loading, login, register, logout, refresh, realtimeConnected],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
