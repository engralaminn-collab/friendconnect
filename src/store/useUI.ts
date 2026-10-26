"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ToastKind = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  kind: ToastKind;
}

interface UIState {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  toasts: Toast[];
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      sidebarCollapsed: false,
      commandOpen: false,
      toasts: [],
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      pushToast: (toast) => {
        const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "friendconnect-ui-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

export function useToast() {
  const pushToast = useUI((s) => s.pushToast);
  return {
    success: (title: string, description?: string) =>
      pushToast({ title, description, kind: "success" }),
    info: (title: string, description?: string) =>
      pushToast({ title, description, kind: "info" }),
    warning: (title: string, description?: string) =>
      pushToast({ title, description, kind: "warning" }),
    error: (title: string, description?: string) =>
      pushToast({ title, description, kind: "error" }),
  };
}
