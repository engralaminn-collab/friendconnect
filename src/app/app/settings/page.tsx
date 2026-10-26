"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Copy,
  Download,
  KeyRound,
  Link2,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Rss,
  Shield,
  Sun,
  Trash2,
  User,
  Webhook,
  RadioTower,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, Toggle } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useUI, useToast } from "@/store/useUI";
import { cn, copyToClipboard, uid } from "@/lib/utils";
import { DataMigrationPanel } from "@/components/settings/DataMigrationPanel";

const INTEGRATIONS = [
  { id: "hubspot", name: "HubSpot CRM", desc: "Two-way contact and deal sync", icon: "🔗", connected: true },
  { id: "gmail", name: "Gmail", desc: "Send from and read shared mailboxes", icon: "✉️", connected: true },
  { id: "slack", name: "Slack", desc: "Post deal alerts to a channel", icon: "💬", connected: false },
  { id: "twilio", name: "Twilio", desc: "SMS and WhatsApp delivery", icon: "📱", connected: true },
  { id: "stripe", name: "Stripe", desc: "Billing and revenue attribution", icon: "💳", connected: false },
  { id: "notion", name: "Notion", desc: "Mirror wiki pages both ways", icon: "📘", connected: false },
  { id: "zapier", name: "Zapier", desc: "Trigger 6,000+ downstream actions", icon: "⚡", connected: false },
  { id: "rss", name: "RSS Hub", desc: "Pull any site as a feed", icon: "📡", connected: false },
];

const FEEDS = [
  { id: "f1", name: "Hacker News — Show HN", url: "https://rsshub.app/hackernews/newest", unread: 4 },
  { id: "f2", name: "Lobsters — HN", url: "https://rsshub.app/lobsters/hn", unread: 0 },
  { id: "f3", name: "GitHub Trending", url: "https://rsshub.app/github/trending/daily/any", unread: 12 },
  { id: "f4", name: "Marketing Brew", url: "https://rsshub.app/marketing/newsletter", unread: 1 },
];

const API_KEYS = [
  { id: "k1", name: "Production workspace", prefix: "fc_live_8Kd2", created: "12 Jan 2026", lastUsed: "2 hours ago", scopes: ["read", "write"] },
  { id: "k2", name: "Zapier integration", prefix: "fc_live_Qp71", created: "3 Mar 2026", lastUsed: "Yesterday", scopes: ["read", "write", "webhooks"] },
  { id: "k3", name: "Staging", prefix: "fc_test_4Wz9", created: "20 Mar 2026", lastUsed: "Never", scopes: ["read"] },
];

export default function SettingsPage() {
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);
  const resetWorkspace = useStore((s) => s.resetWorkspace);
  const gateways = useStore((s) => s.gateways);
  const toast = useToast();

  const [tab, setTab] = React.useState("profile");
  const [profile, setProfile] = React.useState({
    name: "Maya Rahman",
    email: "maya@northwind.consulting",
    role: "Head of Growth",
    company: "Northwind Consulting",
    bio: "Runs the consultancy pipeline and the education cohort. Interested in attribution that survives a budget meeting.",
    timezone: "Europe/London",
  });
  const [notifs, setNotifs] = React.useState({
    email: true,
    push: true,
    leadAssigned: true,
    applicationUpdates: true,
    weeklyDigest: false,
    mention: true,
  });
  const [keys, setKeys] = React.useState(API_KEYS);
  const [newKey, setNewKey] = React.useState<string | null>(null);
  const [connected, setConnected] = React.useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.map((i) => [i.id, i.connected])),
  );
  const [feeds, setFeeds] = React.useState(FEEDS);
  const [feedUrl, setFeedUrl] = React.useState("");
  const [resetModal, setResetModal] = React.useState(false);

  const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "integrations", label: "Integrations", icon: Link2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "developer", label: "Developer", icon: KeyRound },
    { id: "feeds", label: "RSS feeds", icon: Rss },
    { id: "data", label: "Data", icon: RefreshCw },
  ];

  const createKey = () => {
    const key = `fc_live_${uid("k").replace(/[^a-z0-9]/gi, "")}`;
    setKeys([...keys, { id: uid("k"), name: "New key", prefix: key.slice(0, 13), created: "Today", lastUsed: "Never", scopes: ["read"] }]);
    setNewKey(key);
  };

  const addFeed = () => {
    const url = feedUrl.trim();
    if (!url) {
      toast.warning("Missing feed", "Paste a feed URL.");
      return;
    }
    setFeeds([
      { id: uid("f"), name: url.replace(/^https?:\/\//, "").slice(0, 32), url, unread: 0 },
      ...feeds,
    ]);
    setFeedUrl("");
    toast.success("Feed subscribed", "New items will appear in the inbox.");
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Profile, appearance, integrations, notifications, developer keys and your data — all in one place."
      />

      <div className="mt-2 grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="fc-card h-fit p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                tab === t.id
                  ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                  : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {/* ---------------- Profile ---------------- */}
          {tab === "profile" && (
            <div className="fc-card p-6">
              <h2 className="text-[17px] font-semibold">Your profile</h2>
              <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
                This is what teammates see on your activity and notes.
              </p>

              <div className="mt-5 flex items-center gap-4">
                <Avatar name={profile.name} hue={226} size={64} />
                <div>
                  <p className="text-[15px] font-semibold">{profile.name}</p>
                  <p className="text-[12.5px] text-[var(--fc-fg-muted)]">{profile.role}</p>
                  <button
                    onClick={() => toast.info("Upload", "Avatars sync with your SSO provider.")}
                    className="btn btn-secondary btn-sm mt-2"
                  >
                    Change photo
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold">Name</span>
                  <input
                    className="field"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold">Email</span>
                  <input
                    className="field"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold">Role</span>
                  <input
                    className="field"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold">Company</span>
                  <input
                    className="field"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Bio</span>
                <textarea
                  className="field min-h-[90px] resize-y"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </label>
              <label className="mt-4 block max-w-xs">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Timezone</span>
                <select
                  className="field"
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                >
                  {["Europe/London", "Europe/Dublin", "Europe/Berlin", "Asia/Dhaka", "America/New_York", "Asia/Tokyo"].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    ),
                  )}
                </select>
              </label>

              <button
                onClick={() => toast.success("Profile saved", profile.name)}
                className="btn btn-primary btn-sm mt-5"
              >
                <Check className="size-3.5" />
                Save profile
              </button>
            </div>
          )}

          {/* ---------------- Appearance ---------------- */}
          {tab === "appearance" && (
            <div className="fc-card p-6">
              <h2 className="text-[17px] font-semibold">Appearance</h2>
              <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
                The theme applies across the workspace and the marketing site.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "system", label: "System", icon: Monitor },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (opt.id !== "system") setTheme(opt.id);
                      toast.info("Theme", `${opt.label} selected.`);
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      theme === opt.id
                        ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.07]"
                        : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <opt.icon
                      className={cn(
                        "size-5",
                        theme === opt.id
                          ? "text-[var(--color-brand-500)]"
                          : "text-[var(--fc-fg-muted)]",
                      )}
                    />
                    <div className="mt-2 text-[13.5px] font-semibold">{opt.label}</div>
                    <div className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                      {opt.id === "system"
                        ? "Follow your OS setting"
                        : opt.id === "light"
                        ? "Bright surfaces, ink text"
                        : "Ink surfaces, aurora accents"}
                    </div>
                  </button>
                ))}
              </div>

              <h3 className="mt-7 text-[15px] font-semibold">Accent</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  { name: "Indigo", value: "#3b64f6" },
                  { name: "Teal", value: "#14b8a6" },
                  { name: "Amber", value: "#f59e0b" },
                  { name: "Violet", value: "#8b5cf6" },
                  { name: "Rose", value: "#f43f5e" },
                ].map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      document.documentElement.style.setProperty(
                        "--color-brand-500",
                        c.value,
                      );
                      toast.success("Accent changed", `${c.name} is now the workspace accent.`);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-[12.5px] font-medium"
                  >
                    <span
                      className="size-4 rounded-full"
                      style={{ backgroundColor: c.value }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--fc-fg-subtle)]">
                Accent changes apply to this browser only. Reset with the data export
                control below.
              </p>
            </div>
          )}

          {/* ---------------- Integrations ---------------- */}
          {tab === "integrations" && (
            <div className="fc-card p-6">
              <h2 className="text-[17px] font-semibold">Integrations</h2>
              <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
                Connect the tools you already use. Each one declares what it can read
                and write before you grant access.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {INTEGRATIONS.map((i) => {
                  const isOn = connected[i.id];
                  return (
                    <div
                      key={i.id}
                      className="flex items-start gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--fc-surface)] text-[18px]">
                        {i.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] font-semibold">{i.name}</span>
                          {isOn && <Badge tone="success">Connected</Badge>}
                        </div>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                          {i.desc}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setConnected({ ...connected, [i.id]: !isOn });
                          toast[isOn ? "info" : "success"](
                            isOn ? "Disconnected" : "Connected",
                            `${i.name} ${isOn ? "revoked" : "linked"} to this workspace.`,
                          );
                        }}
                        className={cn("btn btn-sm shrink-0", isOn ? "btn-ghost" : "btn-primary")}
                      >
                        {isOn ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold">
                  <RadioTower className="size-4 text-[var(--color-accent-500)]" />
                  Communication gateways
                </h3>
                <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
                  SMS providers, the ComfyUI render queue, SIP signalling and the
                  promise-based IPC bridge that the messenger runs on.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {gateways.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-2.5 py-1.5 text-[11.5px] font-semibold"
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          g.connected ? "bg-emerald-500" : "bg-[var(--fc-fg-subtle)]",
                        )}
                      />
                      {g.name}
                    </span>
                  ))}
                </div>
                <Link
                  href="/app/gateways"
                  className="btn btn-secondary btn-sm mt-3"
                >
                  Manage gateways
                </Link>
              </div>

              <div className="mt-6 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold">
                  <Webhook className="size-4 text-[var(--color-brand-500)]" />
                  Outgoing webhooks
                </h3>
                <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
                  POST every workspace event to your own endpoints.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "lead.created",
                    "application.stage_changed",
                    "agent.run_finished",
                    "invoice.paid",
                  ].map((ev) => (
                    <span key={ev} className="chip">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- Notifications ---------------- */}
          {tab === "notifications" && (
            <div className="fc-card p-6">
              <h2 className="text-[17px] font-semibold">Notifications</h2>
              <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
                Choose what reaches you, and where.
              </p>
              <div className="mt-5 space-y-1">
                {[
                  { k: "email" as const, l: "Email notifications", d: "Send everything to your inbox as well." },
                  { k: "push" as const, l: "In-app notifications", d: "Show a toast for activity in this workspace." },
                  { k: "leadAssigned" as const, l: "Lead assigned to me", d: "When a record lands in your name." },
                  { k: "applicationUpdates" as const, l: "Application stage changes", d: "Submissions, offers and rejections." },
                  { k: "mention" as const, l: "Mentions and replies", d: "When a teammate mentions you." },
                  { k: "weeklyDigest" as const, l: "Weekly digest", d: "Monday summary of pipeline and cohort health." },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex items-center gap-4 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold">{row.l}</div>
                      <div className="text-[11.5px] text-[var(--fc-fg-muted)]">{row.d}</div>
                    </div>
                    <Toggle
                      checked={notifs[row.k]}
                      onChange={(v) => setNotifs({ ...notifs, [row.k]: v })}
                      label={row.l}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => toast.success("Preferences saved", "Notification settings updated.")}
                className="btn btn-primary btn-sm mt-5"
              >
                <Check className="size-3.5" />
                Save preferences
              </button>
            </div>
          )}

          {/* ---------------- Developer ---------------- */}
          {tab === "developer" && (
            <div className="fc-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-semibold">API keys</h2>
                  <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
                    Keys authenticate the public API. Rotate them quarterly.
                  </p>
                </div>
                <button onClick={createKey} className="btn btn-primary btn-sm">
                  <KeyRound className="size-3.5" />
                  New key
                </button>
              </div>

              {newKey && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4">
                  <p className="text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Copy this key now — it will not be shown again.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-3 py-2 font-mono text-[12px]">
                      {newKey}
                    </code>
                    <button
                      onClick={async () => {
                        const ok = await copyToClipboard(newKey);
                        toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-xl border border-[var(--fc-line)]">
                <table className="w-full text-left">
                  <thead className="bg-[var(--fc-surface-2)] text-[11px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Name</th>
                      <th className="px-4 py-2.5 font-semibold">Key</th>
                      <th className="px-4 py-2.5 font-semibold">Scopes</th>
                      <th className="px-4 py-2.5 font-semibold">Last used</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fc-line)]">
                    {keys.map((k) => (
                      <tr key={k.id} className="text-[12.5px]">
                        <td className="px-4 py-3 font-semibold">{k.name}</td>
                        <td className="px-4 py-3 font-mono text-[11.5px] text-[var(--fc-fg-muted)]">
                          {k.prefix}••••••••
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.map((s) => (
                              <span key={s} className="chip">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--fc-fg-muted)]">{k.lastUsed}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setKeys(keys.filter((x) => x.id !== k.id));
                              toast.info("Key revoked", k.name);
                            }}
                            className="btn btn-ghost btn-icon size-8 text-rose-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-7 text-[15px] font-semibold">Base URL</h3>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 font-mono text-[12px]">
                  https://api.friendconnect.app/v1
                </code>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard("https://api.friendconnect.app/v1");
                    toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Feeds ---------------- */}
          {tab === "feeds" && (
            <div className="fc-card p-6">
              <h2 className="text-[17px] font-semibold">RSS feeds</h2>
              <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
                Subscribe to anything with a feed. New items land in the inbox so
                market changes show up next to your conversations.
              </p>

              <div className="mt-5 flex gap-2">
                <input
                  className="field flex-1"
                  placeholder="https://rsshub.app/github/trending/daily/any"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                />
                <button onClick={addFeed} className="btn btn-primary">
                  <Rss className="size-4" />
                  Subscribe
                </button>
              </div>

              <ul className="mt-5 divide-y divide-[var(--fc-line)] overflow-hidden rounded-xl border border-[var(--fc-line)]">
                {feeds.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 bg-[var(--fc-surface-2)] px-4 py-3"
                  >
                    <Rss className="size-4 shrink-0 text-[var(--color-accent-500)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold">{f.name}</span>
                        {f.unread > 0 && <Badge tone="brand">{f.unread} new</Badge>}
                      </div>
                      <div className="truncate font-mono text-[11px] text-[var(--fc-fg-subtle)]">
                        {f.url}
                      </div>
                    </div>
                    <button
                      onClick={() => setFeeds(feeds.filter((x) => x.id !== f.id))}
                      className="btn btn-ghost btn-icon size-8 text-rose-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ---------------- Data ---------------- */}
          {tab === "data" && (
            <div className="space-y-4">
              <DataMigrationPanel />

              <div className="fc-card p-6">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <Shield className="size-4 text-rose-500" />
                  Local demo reset
                </h3>
                <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                  Resets only the browser-side demo workspace and UI preferences. Messages,
                  contacts, media and records already saved to your account are not affected.
                </p>
                <button
                  onClick={() => setResetModal(true)}
                  className="btn btn-danger btn-sm mt-3"
                >
                  <Trash2 className="size-3.5" />
                  Reset local demo data
                </button>
              </div>

              <div className="fc-card p-6">
                <h3 className="text-[15px] font-semibold">Storage & privacy</h3>
                <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {[
                    "Authoritative data lives in MySQL, never in browser localStorage.",
                    "Local storage holds UI preferences, drafts and the one-time migration marker only.",
                    "Media is private: downloads require an authenticated, authorized session.",
                    "Server backups are plain JSON you can read, diff and archive.",
                    "Sessions use opaque tokens in HttpOnly cookies; signing out revokes them server-side.",
                  ].map((r) => (
                    <li key={r} className="flex items-start gap-2.5">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--color-accent-500)]" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={resetModal}
        onClose={() => setResetModal(false)}
        title="Reset local demo data?"
        description="Only browser-side demo data and UI preferences are reset. Server data is untouched."
        size="sm"
        footer={
          <>
            <button onClick={() => setResetModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button
              onClick={() => {
                resetWorkspace();
                setResetModal(false);
                toast.success("Workspace reset", "Everything is back to the seed data.");
              }}
              className="btn btn-danger btn-sm"
            >
              <Trash2 className="size-3.5" />
              Reset everything
            </button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
          This clears the local demo workspace in this browser only. Messages, contacts
          and files already persisted to your FriendConnect account remain available on
          every device.
        </p>
      </Modal>
    </div>
  );
}
