"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  CheckCheck,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Smartphone,
  Video,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, relativeTime } from "@/lib/utils";
import type { Thread } from "@/lib/types";

const channelMeta: Record<
  Thread["channel"],
  { label: string; icon: React.ElementType; color: string }
> = {
  sms: { label: "SMS", icon: Smartphone, color: "#14b8a6" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "#22c55e" },
  email: { label: "Email", icon: Mail, color: "#3b64f6" },
  voip: { label: "VoIP", icon: Phone, color: "#8b5cf6" },
};

export default function InboxPage() {
  const threads = useStore((s) => s.threads);
  const contacts = useStore((s) => s.contacts);
  const sendMessage = useStore((s) => s.sendMessage);
  const markRead = useStore((s) => s.markThreadRead);
  const toast = useToast();

  const [activeId, setActiveId] = React.useState<string | null>(threads[0]?.id ?? null);
  const [channel, setChannel] = React.useState<Thread["channel"] | "all">("all");
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads
      .filter((t) => channel === "all" || t.channel === channel)
      .filter(
        (t) =>
          !q ||
          t.contactName.toLowerCase().includes(q) ||
          t.messages.some((m) => m.body.toLowerCase().includes(q)),
      )
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [threads, channel, query]);

  const active = threads.find((t) => t.id === activeId) ?? filtered[0] ?? null;
  const unread = threads.reduce((a, t) => a + t.unread, 0);

  const channelData = (Object.keys(channelMeta) as Thread["channel"][]).map((ch) => ({
    label: channelMeta[ch].label,
    value: threads.filter((t) => t.channel === ch).length,
    color: channelMeta[ch].color,
  }));

  const selectThread = (t: Thread) => {
    setActiveId(t.id);
    markRead(t.id);
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!draft.trim()) {
      toast.warning("Empty message", "Type something first.");
      return;
    }
    sendMessage(active.id, draft.trim());
    setDraft("");
    toast.success("Sent", `Message delivered to ${active.contactName}.`);
  };

  const contact = active ? contacts.find((c) => c.id === active.contactId) : null;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Communication"
        title="Inbox"
        description="SMS, WhatsApp, email and VoIP threads in one list, with a shared unread count and per-thread context from the CRM."
        actions={
          <Link href="/app/messenger" className="btn btn-primary btn-sm">
            <MessageSquare className="size-3.5" />
            Open the full messenger
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Threads"
          value={threads.length}
          deltaLabel="across every channel"
          icon={<MessageSquare className="size-4" />}
        />
        <StatCard
          label="Unread"
          value={unread}
          deltaLabel="waiting for a reply"
          icon={<Clock className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Messages"
          value={threads.reduce((a, t) => a + t.messages.length, 0)}
          deltaLabel="in the conversation log"
          icon={<Mail className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Response time"
          value="2.4h"
          deltaLabel="median, last 30 days"
          icon={<CheckCheck className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr_280px]">
        {/* ---------- Thread list ---------- */}
        <div className="fc-card flex flex-col overflow-hidden">
          <div className="border-b border-[var(--fc-line)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-8"
                placeholder="Search conversations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <FilterChip active={channel === "all"} onClick={() => setChannel("all")}>
                All
              </FilterChip>
              {(Object.keys(channelMeta) as Thread["channel"][]).map((ch) => (
                <FilterChip
                  key={ch}
                  active={channel === ch}
                  onClick={() => setChannel(channel === ch ? "all" : ch)}
                  count={threads.filter((t) => t.channel === ch).length}
                >
                  {channelMeta[ch].label}
                </FilterChip>
              ))}
            </div>
          </div>
          <ul className="fc-scroll-thin max-h-[540px] overflow-y-auto">
            {filtered.map((t) => {
              const meta = channelMeta[t.channel];
              const Icon = meta.icon;
              const last = t.messages[t.messages.length - 1];
              return (
                <li key={t.id}>
                  <button
                    onClick={() => selectThread(t)}
                    className={cn(
                      "flex w-full gap-3 border-b border-[var(--fc-line)] px-3.5 py-3 text-left transition-colors",
                      active?.id === t.id
                        ? "bg-[var(--color-brand-500)]/[0.09]"
                        : "hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <span
                      className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold">
                          {t.contactName}
                        </span>
                        {t.unread > 0 && (
                          <span className="ml-auto grid size-[18px] shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)] text-[10px] font-bold text-white">
                            {t.unread}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-[var(--fc-fg-muted)]">
                        {last ? `${last.from === "me" ? "You: " : ""}${last.body}` : "No messages yet"}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {relativeTime(t.updatedAt)} · {meta.label}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-[var(--fc-fg-muted)]">
                No conversations match.
              </li>
            )}
          </ul>
        </div>

        {/* ---------- Conversation ---------- */}
        <div className="fc-card flex min-h-[560px] flex-col overflow-hidden">
          {!active ? (
            <EmptyState
              icon={<MessageSquare className="size-6" />}
              title="No conversation open"
              description="Pick a thread from the list."
            />
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: channelMeta[active.channel].color }}
                >
                  {(() => {
                    const Icon = channelMeta[active.channel].icon;
                    return <Icon className="size-4" />;
                  })()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{active.contactName}</div>
                  <div className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                    {channelMeta[active.channel].label}
                    {contact?.company && ` · ${contact.company}`}
                  </div>
                </div>
                <Badge
                  tone={
                    active.status === "open"
                      ? "brand"
                      : active.status === "waiting"
                      ? "signal"
                      : "success"
                  }
                  dot
                >
                  {active.status}
                </Badge>
                {active.channel === "voip" && (
                  <button
                    onClick={() => toast.info("Calling", `Dialling ${active.contactName}…`)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Video className="size-3.5" />
                    Call
                  </button>
                )}
              </header>

              <div className="fc-scroll-thin flex-1 space-y-3 overflow-y-auto p-5">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
                        m.from === "me"
                          ? "rounded-br-md bg-[var(--color-brand-500)] text-white"
                          : "rounded-bl-md border border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
                      )}
                    >
                      {m.body}
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-1.5 text-[10.5px]",
                          m.from === "me"
                            ? "justify-end text-white/70"
                            : "text-[var(--fc-fg-subtle)]",
                        )}
                      >
                        {new Date(m.at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.from === "me" && m.status === "read" && (
                          <CheckCheck className="size-3" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {active.messages.length === 0 && (
                  <EmptyState
                    icon={<Send className="size-6" />}
                    title="No messages yet"
                    description="Start the conversation."
                  />
                )}
              </div>

              <form onSubmit={send} className="border-t border-[var(--fc-line)] p-3.5">
                <div className="flex items-end gap-2">
                  <textarea
                    className="field max-h-32 min-h-[42px] flex-1 resize-y"
                    placeholder={`Reply to ${active.contactName}…`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(e as unknown as React.FormEvent);
                      }
                    }}
                  />
                  <button type="submit" className="btn btn-primary">
                    <Send className="size-4" />
                    Send
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[var(--fc-fg-subtle)]">
                  Enter to send · Shift+Enter for a new line
                </p>
              </form>
            </>
          )}
        </div>

        {/* ---------- Context ---------- */}
        <aside className="space-y-4">
          {contact && (
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Contact context</h3>
              <dl className="mt-3 space-y-2">
                {[
                  { l: "Email", v: contact.email },
                  { l: "Phone", v: contact.phone ?? "—" },
                  { l: "Company", v: contact.company ?? "—" },
                  { l: "Stage", v: contact.stage },
                  { l: "Value", v: contact.value ? `£${contact.value.toLocaleString()}` : "—" },
                  { l: "Last touch", v: relativeTime(contact.lastContact) },
                ].map((row) => (
                  <div
                    key={row.l}
                    className="flex items-center justify-between gap-3 text-[12.5px]"
                  >
                    <dt className="text-[var(--fc-fg-muted)]">{row.l}</dt>
                    <dd className="truncate font-semibold capitalize">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Channel mix</h3>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Threads"
                centerValue={String(threads.length)}
                data={channelData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Quick replies</h3>
            <div className="mt-3 space-y-2">
              {[
                "Thanks — sending that over now.",
                "Can we take 15 minutes tomorrow?",
                "Just confirming we are still on for this.",
                "I have attached the document you asked for.",
              ].map((r) => (
                <button
                  key={r}
                  onClick={() => setDraft(r)}
                  className="w-full rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-left text-[12px] text-[var(--fc-fg-muted)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--fc-fg)]"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
