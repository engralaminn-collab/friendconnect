"use client";

/**
 * One-time migration of the legacy localStorage workspace into the backend.
 * Reads the Zustand persist payload, maps it to the server import contract and
 * marks completion locally so it never runs twice. Failures are non-blocking
 * and can be retried manually from Settings.
 */
import { migrationApi } from "./resources";

const LEGACY_KEY = "friendconnect-workspace-v1";
const MIGRATION_MARKER = "friendconnect-migration-v1";

/** Collections whose records belong to the generic workspace document store. */
const WORKSPACE_COLLECTIONS: Record<string, string> = {
  contacts: "crm-contacts",
  companies: "crm-companies",
  deals: "crm-deals",
  leads: "crm-leads",
  activities: "crm-activities",
  tasks: "crm-tasks",
  universities: "edu-universities",
  courses: "edu-courses",
  students: "edu-students",
  applications: "edu-applications",
  studySessions: "edu-study-sessions",
  articles: "mkt-articles",
  campaigns: "mkt-campaigns",
  socialPosts: "mkt-social-posts",
  seoAudits: "mkt-seo-audits",
  diagrams: "studio-diagrams",
  videos: "studio-videos",
  voiceClips: "studio-voice-clips",
  agents: "studio-agents",
  agentRuns: "studio-agent-runs",
  imageJobs: "studio-image-jobs",
  notes: "kb-notes",
  wikiPages: "kb-wiki",
  plugins: "kb-plugins",
  apis: "kb-apis",
  posts: "community-posts",
  events: "community-events",
  calls: "call-records",
  devices: "devices",
  gateways: "gateways",
  notifications: "notifications",
};

export function hasLegacyData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(LEGACY_KEY));
  } catch {
    return false;
  }
}

export async function runLocalMigration(force = false): Promise<{ migrated: boolean; summary?: unknown }> {
  if (typeof window === "undefined") return { migrated: false };
  if (!force && window.localStorage.getItem(MIGRATION_MARKER)) return { migrated: false };
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return { migrated: false };

  let parsed: { state?: Record<string, unknown> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { migrated: false };
  }
  const state = parsed.state ?? {};
  const threads = Array.isArray(state.threads) ? state.threads : [];
  const contacts = Array.isArray(state.contacts) ? state.contacts : [];

  const workspace: Record<string, unknown[]> = {};
  for (const [field, collection] of Object.entries(WORKSPACE_COLLECTIONS)) {
    const value = state[field];
    if (Array.isArray(value) && value.length) {
      workspace[collection] = value.map((record) => ({
        recordId: String((record as { id?: string }).id ?? crypto.randomUUID()),
        data: record,
      }));
    }
  }

  const result = await migrationApi.importLocal({
    threads: threads.map((t) => t),
    contacts: contacts.map((c) => c),
    workspace,
    force,
  });
  window.localStorage.setItem(MIGRATION_MARKER, JSON.stringify({ at: new Date().toISOString() }));
  return { migrated: true, summary: (result as { summary?: unknown }).summary };
}

/** Export the legacy payload as a downloadable JSON backup. */
export function exportLegacyData(): void {
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `friendconnect-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
