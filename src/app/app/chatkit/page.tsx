"use client";

import * as React from "react";
import {
  Accessibility,
  Boxes,
  Check,
  Component,
  Globe2,
  Layers,
  Monitor,
  Palette,
  Puzzle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Wrench,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/primitives";
import { KitPreview } from "@/components/messaging/ChatKitPreviews";
import {
  A11Y_CHECKS,
  EXTENSIONS,
  KIT_COMPONENTS,
  KIT_FAMILIES,
  LOCALES,
  THEME_TOKENS,
  type KitFamily,
} from "@/lib/data/chatkit";
import { cn } from "@/lib/utils";

type Tab = "components" | "platforms" | "theming" | "a11y" | "extensions";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "components", label: "Components", icon: Component },
  { id: "platforms", label: "Platforms", icon: Layers },
  { id: "theming", label: "Theming", icon: Palette },
  { id: "a11y", label: "Accessibility", icon: Accessibility },
  { id: "extensions", label: "Extensions", icon: Puzzle },
];

const FAMILY_ICON: Record<KitFamily, React.ElementType> = {
  react: Monitor,
  angular: Monitor,
  "react-native": Smartphone,
  ios: Smartphone,
  android: Smartphone,
  flutter: Tablet,
  headless: Wrench,
};

const GROUPS = [
  "Conversations",
  "Messages",
  "Bubbles",
  "Calling",
  "AI",
  "Engagement",
  "People",
  "Utilities",
] as const;

export default function ChatKitPage() {
  const [tab, setTab] = React.useState<Tab>("components");
  const [group, setGroup] = React.useState<string>("All");
  const [family, setFamily] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");

  const filtered = KIT_COMPONENTS.filter((c) => {
    if (group !== "All" && c.group !== group) return false;
    if (family !== "all" && !c.platforms.includes(family as KitFamily)) return false;
    if (
      query &&
      !c.name.toLowerCase().includes(query.toLowerCase()) &&
      !c.description.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    return true;
  });

  const stable = KIT_COMPONENTS.filter((c) => c.status === "stable").length;
  const withPreview = KIT_COMPONENTS.filter((c) =>
    ["Conversations", "MessageList", "MessageComposer", "TextBubble", "ImageBubble", "VideoBubble", "VoiceNoteBubble", "FileBubble", "StickerBubble", "PollBubble", "CallBubble", "Reactions", "ReactionList", "PinnedMessages", "Search", "CallLogs", "IncomingCall", "OngoingCall", "AIAssistantChat", "SmartReplies", "MessageInformation", "FlagMessageDialog", "GroupMembers", "NotificationFeed", "SavedMessages"].includes(
      c.name,
    ),
  ).length;

  return (
    <div className="mx-auto max-[1700px]">
      <PageHeader
        eyebrow="Design system"
        title="Chat UI kit"
        description="The component inventory behind the messenger: conversations, every bubble type, calling surfaces, AI surfaces, the theming contract, the accessibility contract and the extensions that switch features on."
        actions={
          <div className="flex gap-1.5">
            <button
              onClick={() => setFamily("all")}
              className={cn("btn btn-sm", family === "all" ? "btn-primary" : "btn-secondary")}
            >
              <Globe2 className="size-3.5" />
              All platforms
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Components"
          value={KIT_COMPONENTS.length}
          deltaLabel={`${stable} stable, ${KIT_COMPONENTS.length - stable} in progress`}
          icon={<Component className="size-4" />}
        />
        <StatCard
          label="Platforms"
          value={KIT_FAMILIES.length}
          deltaLabel="6 UI kits and a headless calling SDK"
          icon={<Layers className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Theme tokens"
          value={THEME_TOKENS.length}
          deltaLabel="colour, shape, type, spacing, motion"
          icon={<Palette className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Extensions"
          value={EXTENSIONS.length}
          deltaLabel="each one declares what it needs"
          icon={<Puzzle className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              tab === t.id
                ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* =================== COMPONENTS =================== */}
      {tab === "components" && (
        <div className="mt-4">
          <div className="fc-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
                <input
                  className="field h-8 pl-8 text-[12.5px]"
                  placeholder="Search components…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <FilterChip active={group === "All"} onClick={() => setGroup("All")} count={KIT_COMPONENTS.length}>
                All
              </FilterChip>
              {GROUPS.map((g) => {
                const n = KIT_COMPONENTS.filter((c) => c.group === g).length;
                if (!n) return null;
                return (
                  <FilterChip
                    key={g}
                    active={group === g}
                    onClick={() => setGroup(g)}
                    count={n}
                  >
                    {g}
                  </FilterChip>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-[12px] text-[var(--fc-fg-subtle)]">
            {filtered.length} component{filtered.length === 1 ? "" : "s"} ·{" "}
            {withPreview} render a live preview
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((c) => {
              const Icon = FAMILY_ICON[c.family];
              return (
                <div key={c.name} className="fc-card fc-card-hover overflow-hidden">
                  <div className="border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                    <KitPreview name={c.name} />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[13.5px] font-semibold">{c.name}</h3>
                      <Badge
                        tone={
                          c.status === "stable"
                            ? "success"
                            : c.status === "beta"
                            ? "signal"
                            : "violet"
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {c.description}
                    </p>
                    {c.requires.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.requires.map((r) => (
                          <span
                            key={r}
                            className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fc-fg-muted)]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-[var(--fc-line)] pt-2.5">
                      {c.platforms.map((p) => {
                        const PIcon = FAMILY_ICON[p];
                        return (
                          <span
                            key={p}
                            title={p}
                            className="grid size-5 place-items-center rounded bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]"
                          >
                            <PIcon className="size-2.5" />
                          </span>
                        );
                      })}
                      <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {c.platforms.length} platforms
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================== PLATFORMS =================== */}
      {tab === "platforms" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {KIT_FAMILIES.map((f) => {
            const Icon = FAMILY_ICON[f.id];
            const comps = KIT_COMPONENTS.filter((c) => c.platforms.includes(f.id));
            return (
              <div key={f.id} className="fc-card p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold">{f.label}</h3>
                      <Badge tone="accent">{f.version}</Badge>
                      <Badge>{f.surface}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                      {f.language}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {f.note}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {comps.slice(0, 12).map((c) => (
                    <span key={c.name} className="chip text-[10.5px]">
                      {c.name}
                    </span>
                  ))}
                  {comps.length > 12 && (
                    <span className="chip text-[10.5px]">+{comps.length - 12} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================== THEMING =================== */}
      {tab === "theming" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="fc-card overflow-hidden">
            <div className="border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
              <h2 className="text-[15px] font-semibold">Theme tokens</h2>
              <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                One token, four spellings. Override the token, never the component
                internals.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[var(--fc-surface-2)] text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Token</th>
                    <th className="px-4 py-2 font-semibold">Group</th>
                    <th className="px-4 py-2 font-semibold">React</th>
                    <th className="px-4 py-2 font-semibold">Android</th>
                    <th className="px-4 py-2 font-semibold">iOS</th>
                    <th className="px-4 py-2 font-semibold">Flutter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fc-line)]">
                  {THEME_TOKENS.map((t) => (
                    <tr key={t.token}>
                      <td className="px-4 py-2 font-mono text-[11px] font-semibold">
                        <span className="flex items-center gap-2">
                          {t.group === "colour" && (
                            <span
                              className="size-3 shrink-0 rounded border border-[var(--fc-line)]"
                              style={{ backgroundColor: t.react }}
                            />
                          )}
                          {t.token}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[var(--fc-fg-muted)]">{t.group}</td>
                      <td className="px-4 py-2 font-mono text-[11px]">{t.react}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[var(--fc-fg-muted)]">
                        {t.android}
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[var(--fc-fg-muted)]">
                        {t.ios}
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[var(--fc-fg-muted)]">
                        {t.flutter}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Localisation</h3>
              <p className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
                Ten languages, two right-to-left.
              </p>
              <ul className="mt-3 space-y-2">
                {LOCALES.map((l) => (
                  <li key={l.code}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold">{l.label}</span>
                      <span className="flex items-center gap-2">
                        {l.rtl && <Badge tone="violet">RTL</Badge>}
                        <span className="tabular-nums text-[var(--fc-fg-subtle)]">
                          {l.progress}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-500)]"
                        style={{ width: `${l.progress}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Install</h3>
              <pre className="fc-scroll-thin mt-2 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[#0d1024] p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
{`npm install @cometchat/chat-uikit-react

npx @cometchat/skills add          # add chat to your app
npx @cometchat/skills add --family flutter
npx @cometchat/skills add --ide cursor`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =================== A11Y =================== */}
      {tab === "a11y" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Accessibility className="size-4 text-[var(--color-accent-500)]" />
              The accessibility contract
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              Every component, on every platform, is checked against these before it
              ships.
            </p>
            <ul className="mt-4 space-y-2">
              {A11Y_CHECKS.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      a.level === "AA"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-[var(--color-violet-500)]/15 text-[var(--color-violet-500)]",
                    )}
                  >
                    {a.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold">{a.title}</span>
                      <Badge>{a.family}</Badge>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {a.detail}
                    </p>
                  </div>
                  <Check className="mt-1 size-4 shrink-0 text-emerald-500" />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <ShieldCheck className="size-4 text-emerald-500" />
                Focus order
              </h3>
              <ol className="mt-3 space-y-1.5">
                {[
                  "Conversation header — search, then call controls",
                  "Message list — bubbles, in reading order",
                  "Composer — attachments, emoji, field, send",
                  "Reaction bar — after the bubble, before the next",
                ].map((s, i) => (
                  <li
                    key={s}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5 text-[12px]"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)]/12 text-[10px] font-bold text-[var(--color-brand-500)]">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <Sparkles className="size-4 text-[var(--color-violet-500)]" />
                What a screen reader hears
              </h3>
              <div className="mt-3 space-y-2 font-mono text-[11.5px]">
                {[
                  "“Amara Osei, image, 1280 by 960, sent 09:42”",
                  "“Outgoing call, 4 minutes 12 seconds, completed”",
                  "“Voice note, 48 seconds. Transcript: the visa slot opens at nine”",
                  "“Poll, which day works, 2 options, you voted Tuesday”",
                ].map((l) => (
                  <div
                    key={l}
                    className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-1.5"
                  >
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== EXTENSIONS =================== */}
      {tab === "extensions" && (
        <div className="mt-4">
          <div className="fc-card p-4">
            <p className="text-[12.5px] text-[var(--fc-fg-muted)]">
              An extension declares the feature it provides and the components it
              needs. Turn it on in the dashboard, then mount the UI — never the other
              way round.
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXTENSIONS.map((e) => (
              <div key={e.id} className="fc-card fc-card-hover p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                    <Boxes className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13.5px] font-semibold">{e.name}</h3>
                    <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                      {e.category}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {e.description}
                </p>
                <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--fc-line)] pt-2.5">
                  <span className="grid size-4 place-items-center rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-500">
                    ✓
                  </span>
                  <span className="text-[11px] text-[var(--fc-fg-muted)]">
                    enabled in this workspace
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
