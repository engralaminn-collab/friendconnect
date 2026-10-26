"use client";

/* ============================================================
   Bill Agent — operator state
   ------------------------------------------------------------
   Kept beside the workspace store but deliberately separate:
   the operator's configuration, history and audit trail survive
   a workspace reset, and nothing here is sent anywhere.
   ============================================================ */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/utils";
import { PROVIDERS, defaultProviderConfig } from "./providers";
import { DEFAULT_MAX_MS, DEFAULT_MAX_STEPS } from "./runtime";
import type { AuditEntry, Automation, ProviderConfig, RunRecord } from "./types";

export type Autonomy = "ask" | "auto-safe" | "auto-all";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
  /** Set for assistant turns that issued tools. */
  tools?: Array<{ name: string; summary: string; ok: boolean; approved: boolean }>;
  runStatus?: string;
}

export interface AgentSettings {
  maxSteps: number;
  maxMs: number;
  autonomy: Autonomy;
  dryRun: boolean;
  temperature: number;
}

export interface RemoteState {
  enabled: boolean;
  token: string;
  lastPollAt?: string;
  executed: number;
  lastError?: string;
}

interface AgentState {
  providers: Record<string, ProviderConfig>;
  activeProviderId: string;
  messages: ChatMessage[];
  runs: RunRecord[];
  auditLog: AuditEntry[];
  automations: Automation[];
  settings: AgentSettings;
  remote: RemoteState;

  setProvider: (id: string, patch: Partial<ProviderConfig>) => void;
  resetProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  setSettings: (patch: Partial<AgentSettings>) => void;
  pushMessage: (message: Omit<ChatMessage, "id" | "at">) => ChatMessage;
  clearMessages: () => void;
  logRun: (run: RunRecord) => void;
  clearRuns: () => void;
  audit: (entry: Omit<AuditEntry, "id" | "at">) => void;
  clearAudit: () => void;
  addAutomation: (automation: Omit<Automation, "id" | "createdAt" | "runCount">) => Automation;
  updateAutomation: (id: string, patch: Partial<Automation>) => void;
  removeAutomation: (id: string) => void;
  setRemote: (patch: Partial<RemoteState>) => void;
  resetAll: () => void;
}

export const DEFAULT_SETTINGS: AgentSettings = {
  maxSteps: DEFAULT_MAX_STEPS,
  maxMs: DEFAULT_MAX_MS,
  autonomy: "auto-safe",
  dryRun: false,
  temperature: 0.2,
};

function initialProviders(): Record<string, ProviderConfig> {
  return PROVIDERS.reduce<Record<string, ProviderConfig>>((acc, preset) => {
    acc[preset.id] = defaultProviderConfig(preset.id);
    return acc;
  }, {});
}

const MAX_AUDIT = 500;
const MAX_RUNS = 60;
const MAX_MESSAGES = 200;

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      providers: initialProviders(),
      activeProviderId: "offline",
      messages: [],
      runs: [],
      auditLog: [],
      automations: [],
      settings: DEFAULT_SETTINGS,
      remote: { enabled: false, token: "", executed: 0 },

      setProvider: (id, patch) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: {
              ...(state.providers[id] ?? defaultProviderConfig(id)),
              ...patch,
            },
          },
        })),
      resetProvider: (id) =>
        set((state) => ({ providers: { ...state.providers, [id]: defaultProviderConfig(id) } })),
      setActiveProvider: (id) => {
        set((state) => ({
          activeProviderId: id,
          providers:
            id === "offline"
              ? state.providers
              : {
                  ...state.providers,
                  [id]: {
                    ...(state.providers[id] ?? defaultProviderConfig(id)),
                    enabled: true,
                  },
                },
        }));
      },
      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      pushMessage: (message) => {
        const created: ChatMessage = {
          ...message,
          id: uid("msg"),
          at: new Date().toISOString(),
        };
        set((state) => ({ messages: [...state.messages, created].slice(-MAX_MESSAGES) }));
        return created;
      },
      clearMessages: () => set({ messages: [] }),
      logRun: (run) => set((state) => ({ runs: [run, ...state.runs].slice(0, MAX_RUNS) })),
      clearRuns: () => set({ runs: [] }),
      audit: (entry) =>
        set((state) => ({
          auditLog: [
            { ...entry, id: uid("aud"), at: new Date().toISOString() },
            ...state.auditLog,
          ].slice(0, MAX_AUDIT),
        })),
      clearAudit: () => set({ auditLog: [] }),
      addAutomation: (automation) => {
        const created: Automation = {
          ...automation,
          id: uid("auto"),
          createdAt: new Date().toISOString(),
          runCount: 0,
        };
        set((state) => ({ automations: [created, ...state.automations] }));
        return created;
      },
      updateAutomation: (id, patch) =>
        set((state) => ({
          automations: state.automations.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      removeAutomation: (id) =>
        set((state) => ({ automations: state.automations.filter((item) => item.id !== id) })),
      setRemote: (patch) => set((state) => ({ remote: { ...state.remote, ...patch } })),
      resetAll: () =>
        set({
          providers: initialProviders(),
          activeProviderId: "offline",
          messages: [],
          runs: [],
          auditLog: [],
          automations: [],
          settings: DEFAULT_SETTINGS,
          remote: { enabled: false, token: "", executed: 0 },
        }),
    }),
    {
      name: "friendconnect-bill-agent-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AgentState>;
        return {
          ...current,
          ...saved,
          // New providers added in a later release must still appear.
          providers: { ...initialProviders(), ...(saved.providers ?? {}) },
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
          remote: { ...current.remote, ...(saved.remote ?? {}) },
        };
      },
    },
  ),
);

/** Convenience selectors used across the operator UI. */
export const selectProvider = (id: string) => (state: AgentState): ProviderConfig =>
  state.providers[id] ?? defaultProviderConfig(id);
