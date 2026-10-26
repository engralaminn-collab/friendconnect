"use client";

import * as React from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Download,
  FileText,
  Flag,
  Mic,
  Paperclip,
  Phone,
  PhoneOff,
  Pin,
  Play,
  Search,
  Send,
  Smile,
  Star,
  ThumbsUp,
  UserPlus,
  Users,
  Video,
  Vote,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { GeneratedArt } from "@/components/studio/GeneratedArt";
import { cn } from "@/lib/utils";

/**
 * Live previews of the chat kit components.
 *
 * Every preview is rendered with the real design system, so the gallery shows
 * what a component looks like rather than describing it.
 */

function Frame({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MiniAvatar({ name, hue = 226, size = 22 }: { name: string; hue?: number; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 68% 54%), hsl(${(hue + 40) % 360} 70% 44%))`,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function MiniBubble({
  mine,
  children,
  meta,
}: {
  mine?: boolean;
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11.5px] leading-relaxed",
          mine
            ? "rounded-br-sm bg-[var(--color-brand-500)] text-white"
            : "rounded-bl-sm bg-[var(--fc-surface-3)] text-[var(--fc-fg)]",
        )}
      >
        {children}
        {meta && (
          <div
            className={cn(
              "mt-0.5 flex items-center justify-end gap-1 text-[9px]",
              mine ? "text-white/70" : "text-[var(--fc-fg-subtle)]",
            )}
          >
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

const previews: Record<string, React.ComponentType> = {
  Conversations: () => (
    <Frame className="p-2">
      {[
        { n: "Amara Osei", p: "Documents are attached…", u: 2, hue: 150 },
        { n: "Samuel Boateng", p: "Perfect — I will call you.", u: 0, hue: 210 },
        { n: "Maya Rahman", p: "Sent you the checklist.pdf", u: 0, hue: 280 },
      ].map((r) => (
        <div
          key={r.n}
          className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 odd:bg-[var(--fc-surface-2)]"
        >
          <MiniAvatar name={r.n} hue={r.hue} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-[11px] font-semibold">{r.n}</span>
              {r.u > 0 && (
                <span className="ml-auto grid size-[14px] place-items-center rounded-full bg-[var(--color-brand-500)] text-[8px] font-bold text-white">
                  {r.u}
                </span>
              )}
            </div>
            <div className="truncate text-[9.5px] text-[var(--fc-fg-subtle)]">{r.p}</div>
          </div>
        </div>
      ))}
    </Frame>
  ),

  MessageList: () => (
    <Frame className="space-y-1.5 p-2.5">
      <div className="text-center text-[8.5px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
        Today
      </div>
      <MiniBubble meta="09:41">
        Morning — can we look at the visa slot on Friday?
      </MiniBubble>
      <MiniBubble mine meta="09:42">
        Sure, I have a 10:30 free. I will send a calendar invite.
      </MiniBubble>
    </Frame>
  ),

  MessageComposer: () => (
    <Frame className="flex items-center gap-1.5 p-2">
      <Paperclip className="size-3.5 shrink-0 text-[var(--fc-fg-subtle)]" />
      <Smile className="size-3.5 shrink-0 text-[var(--fc-fg-subtle)]" />
      <span className="min-w-0 flex-1 truncate rounded-lg bg-[var(--fc-surface-2)] px-2 py-1 text-[10.5px] text-[var(--fc-fg-subtle)]">
        Write a message…
      </span>
      <Send className="size-3.5 shrink-0 text-[var(--color-brand-500)]" />
    </Frame>
  ),

  TextBubble: () => (
    <Frame className="p-2.5">
      <MiniBubble>
        The deadline is <span className="font-semibold">Friday</span> — see the{" "}
        <span className="underline decoration-[var(--color-brand-500)]">checklist</span>{" "}
        and let me know if anything is missing.
      </MiniBubble>
    </Frame>
  ),

  ImageBubble: () => (
    <Frame className="p-2.5">
      <div className="relative overflow-hidden rounded-lg">
        <GeneratedArt seed="kit-image-demo" className="aspect-[4/3] w-full" />
        <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 py-0.5 text-[8px] font-semibold text-white">
          1.2 MB
        </span>
      </div>
    </Frame>
  ),

  VideoBubble: () => (
    <Frame className="p-2.5">
      <div className="relative overflow-hidden rounded-lg">
        <GeneratedArt seed="kit-video-demo" className="aspect-video w-full" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-8 place-items-center rounded-full bg-black/45 backdrop-blur">
            <Play className="size-3.5 fill-white text-white" />
          </span>
        </span>
        <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 py-0.5 text-[8px] font-semibold text-white">
          0:24 · 1080p
        </span>
      </div>
    </Frame>
  ),

  VoiceNoteBubble: () => (
    <Frame className="p-2.5">
      <div className="flex items-center gap-2 rounded-xl bg-[var(--fc-surface-3)] px-2.5 py-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)] text-white">
          <Play className="size-2.5 fill-white" />
        </span>
        <div className="flex h-5 flex-1 items-end gap-[2px]">
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-[var(--color-brand-500)]/60"
              style={{ height: `${4 + ((i * 31) % 14)}px` }}
            />
          ))}
        </div>
        <span className="shrink-0 text-[9px] tabular-nums text-[var(--fc-fg-subtle)]">
          0:48
        </span>
      </div>
    </Frame>
  ),

  FileBubble: () => (
    <Frame className="p-2.5">
      <div className="flex items-center gap-2 rounded-xl bg-[var(--fc-surface-3)] px-2.5 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]">
          <FileText className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-semibold">checklist.pdf</span>
          <span className="block text-[9px] text-[var(--fc-fg-subtle)]">1.2 MB · PDF</span>
        </span>
        <Download className="size-3 shrink-0 text-[var(--fc-fg-subtle)]" />
      </div>
    </Frame>
  ),

  StickerBubble: () => (
    <Frame className="grid place-items-center p-3">
      <span className="text-4xl">🎉</span>
    </Frame>
  ),

  PollBubble: () => (
    <Frame className="p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
        <Vote className="size-3 text-[var(--color-brand-500)]" />
        Which day works?
      </div>
      <div className="mt-1.5 space-y-1">
        {[
          { l: "Tuesday", v: 5, mine: true },
          { l: "Wednesday", v: 3, mine: false },
        ].map((o) => (
          <div
            key={o.l}
            className="relative overflow-hidden rounded-md border border-[var(--fc-line)] px-2 py-1"
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0",
                o.mine ? "bg-[var(--color-brand-500)]/22" : "bg-[var(--fc-surface-3)]",
              )}
              style={{ width: `${(o.v / 5) * 100}%` }}
            />
            <span className="relative flex justify-between text-[10px]">
              {o.l}
              <span className="tabular-nums">{o.v}</span>
            </span>
          </div>
        ))}
      </div>
    </Frame>
  ),

  CallBubble: () => (
    <Frame className="p-2.5">
      <div className="flex items-center gap-2 rounded-xl bg-[var(--fc-surface-3)] px-2.5 py-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
          <Phone className="size-3" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold">Outgoing call</span>
          <span className="block text-[9px] text-[var(--fc-fg-subtle)]">4:12 · completed</span>
        </span>
        <Badge tone="success">MOS 4.3</Badge>
      </div>
    </Frame>
  ),

  Reactions: () => (
    <Frame className="p-2.5">
      <MiniBubble>
        That works, thank you.
        <div className="mt-1 flex gap-1">
          {[
            { e: "👍", c: 3 },
            { e: "🎉", c: 1 },
          ].map((r) => (
            <span
              key={r.e}
              className="inline-flex items-center gap-0.5 rounded-full border border-[var(--fc-line)] bg-[var(--fc-surface)] px-1.5 py-0.5 text-[9px]"
            >
              {r.e}
              {r.c}
            </span>
          ))}
        </div>
      </MiniBubble>
    </Frame>
  ),

  ReactionList: () => (
    <Frame className="space-y-1 p-2.5">
      {[
        { n: "Amara", e: "👍", c: 3 },
        { n: "Samuel", e: "🎉", c: 1 },
        { n: "Maya", e: "👍", c: 1 },
      ].map((r) => (
        <div key={r.n} className="flex items-center gap-2 text-[10.5px]">
          <MiniAvatar name={r.n} size={16} />
          <span className="font-semibold">{r.n}</span>
          <span>{r.e}</span>
          <span className="ml-auto tabular-nums text-[var(--fc-fg-subtle)]">{r.c}</span>
        </div>
      ))}
    </Frame>
  ),

  PinnedMessages: () => (
    <Frame className="space-y-1 p-2.5">
      {[
        { t: "The deadline is Friday 12:00.", p: "Pinned by Amara" },
        { t: "Room 4B, not 3A.", p: "Pinned by Samuel" },
      ].map((p) => (
        <div
          key={p.t}
          className="flex items-start gap-2 rounded-lg border border-[var(--fc-line)] px-2 py-1.5"
        >
          <Pin className="mt-0.5 size-3 shrink-0 text-[var(--color-signal-500)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10.5px] font-semibold">{p.t}</span>
            <span className="block text-[9px] text-[var(--fc-fg-subtle)]">{p.p}</span>
          </span>
        </div>
      ))}
    </Frame>
  ),

  Search: () => (
    <Frame className="p-2.5">
      <div className="flex items-center gap-1.5 rounded-lg border border-[var(--fc-line)] px-2 py-1.5">
        <Search className="size-3 shrink-0 text-[var(--fc-fg-subtle)]" />
        <span className="text-[10.5px] text-[var(--fc-fg-subtle)]">visa slot</span>
        <span className="ml-auto text-[9px] tabular-nums text-[var(--fc-fg-subtle)]">12</span>
      </div>
      <div className="mt-1.5 space-y-1">
        {["Can we look at the visa slot on Friday?", "The visa slot opens at 9am."].map(
          (t) => (
            <div
              key={t}
              className="rounded-md bg-[var(--fc-surface-2)] px-2 py-1 text-[10px]"
            >
              <span className="font-semibold text-[var(--color-brand-500)]">visa slot</span>
              {t.replace("visa slot", "")}
            </div>
          ),
        )}
      </div>
    </Frame>
  ),

  CallLogs: () => (
    <Frame className="divide-y divide-[var(--fc-line)]">
      {[
        { n: "Amara Osei", d: "Outgoing", t: "4:12", c: "emerald" },
        { n: "Samuel Boateng", d: "Incoming", t: "1:03", c: "sky" },
        { n: "Maya Rahman", d: "Missed", t: "—", c: "rose" },
      ].map((c) => (
        <div key={c.n} className="flex items-center gap-2 px-2.5 py-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              c.c === "emerald"
                ? "bg-emerald-500"
                : c.c === "sky"
                ? "bg-sky-500"
                : "bg-rose-500",
            )}
          />
          <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold">{c.n}</span>
          <span className="text-[9px] text-[var(--fc-fg-subtle)]">{c.d}</span>
          <span className="text-[9px] tabular-nums text-[var(--fc-fg-subtle)]">{c.t}</span>
        </div>
      ))}
    </Frame>
  ),

  IncomingCall: () => (
    <Frame className="grid place-items-center p-4">
      <div className="text-center">
        <MiniAvatar name="Amara Osei" hue={150} size={34} />
        <p className="mt-1.5 text-[11px] font-semibold">Amara Osei</p>
        <p className="text-[9px] text-[var(--fc-fg-subtle)]">incoming voice call</p>
        <div className="mt-2 flex justify-center gap-3">
          <span className="grid size-7 place-items-center rounded-full bg-rose-500 text-white">
            <PhoneOff className="size-3" />
          </span>
          <span className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white">
            <Phone className="size-3" />
          </span>
        </div>
      </div>
    </Frame>
  ),

  OngoingCall: () => (
    <Frame className="p-2.5">
      <div className="relative overflow-hidden rounded-lg bg-[linear-gradient(140deg,#111a35,#05070f)] px-2.5 py-3">
        <div className="text-[9.5px] font-semibold text-white">Amara Osei · 2:14</div>
        <div className="mt-0.5 font-mono text-[8.5px] text-white/55">MOS 4.4 · 32ms</div>
        <div className="mt-2 flex justify-center gap-1.5">
          {[Mic, Video, Phone].map((I, i) => (
            <span
              key={i}
              className="grid size-5 place-items-center rounded-full bg-white/12 text-white"
            >
              <I className="size-2.5" />
            </span>
          ))}
          <span className="grid size-5 place-items-center rounded-full bg-rose-500 text-white">
            <PhoneOff className="size-2.5" />
          </span>
        </div>
      </div>
    </Frame>
  ),

  AIAssistantChat: () => (
    <Frame className="space-y-1.5 p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="grid size-5 place-items-center rounded-lg bg-[var(--color-violet-500)]/15 text-[9px] font-bold text-[var(--color-violet-500)]">
          AI
        </span>
        <span className="text-[9.5px] font-semibold text-[var(--color-violet-500)]">
          Assistant
        </span>
        <Badge tone="violet">generated</Badge>
      </div>
      <MiniBubble>
        Amara asked about the visa slot twice this week. Worth a nudge before Friday?
      </MiniBubble>
    </Frame>
  ),

  SmartReplies: () => (
    <Frame className="p-2.5">
      <div className="flex flex-wrap gap-1">
        {["Yes, Friday works", "Can I check and reply?", "Sorry, Tuesday is better"].map(
          (s) => (
            <span
              key={s}
              className="rounded-full border border-[var(--color-brand-400)] bg-[var(--color-brand-500)]/[0.07] px-2 py-1 text-[9.5px] font-medium text-[var(--color-brand-500)]"
            >
              {s}
            </span>
          ),
        )}
      </div>
    </Frame>
  ),

  MessageInformation: () => (
    <Frame className="space-y-1.5 p-2.5">
      {[
        { l: "Delivered", v: "09:42" },
        { l: "Read", v: "09:43" },
        { l: "Edited", v: "—" },
      ].map((r) => (
        <div key={r.l} className="flex items-center justify-between text-[10.5px]">
          <span className="text-[var(--fc-fg-muted)]">{r.l}</span>
          <span className="font-semibold tabular-nums">{r.v}</span>
        </div>
      ))}
      <div className="mt-1 flex gap-1.5 border-t border-[var(--fc-line)] pt-1.5">
        {[Star, Flag, X].map((I, i) => (
          <span
            key={i}
            className="grid size-5 place-items-center rounded-md bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]"
          >
            <I className="size-2.5" />
          </span>
        ))}
      </div>
    </Frame>
  ),

  FlagMessageDialog: () => (
    <Frame className="p-2.5">
      <p className="text-[10.5px] font-semibold">Why are you reporting this?</p>
      <div className="mt-1.5 space-y-1">
        {["Spam or scam", "Harassment", "Something else"].map((r) => (
          <div
            key={r}
            className="rounded-md border border-[var(--fc-line)] px-2 py-1 text-[10px]"
          >
            {r}
          </div>
        ))}
      </div>
    </Frame>
  ),

  GroupMembers: () => (
    <Frame className="space-y-1 p-2.5">
      {[
        { n: "Amara Osei", r: "Owner" },
        { n: "Samuel Boateng", r: "Member" },
        { n: "Maya Rahman", r: "Admin" },
      ].map((m) => (
        <div key={m.n} className="flex items-center gap-2">
          <MiniAvatar name={m.n} size={18} />
          <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold">{m.n}</span>
          <Badge>{m.r}</Badge>
        </div>
      ))}
    </Frame>
  ),

  NotificationFeed: () => (
    <Frame className="space-y-1 p-2.5">
      {[
        { n: "Amara Osei", t: "mentioned you in Design review", i: "@" },
        { n: "Maya Rahman", t: "reacted 👍 to your message", i: "👍" },
      ].map((f) => (
        <div key={f.t} className="flex items-center gap-2">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--fc-surface-3)] text-[9px]">
            {f.i}
          </span>
          <span className="min-w-0 flex-1 truncate text-[10px]">
            <span className="font-semibold">{f.n}</span> {f.t}
          </span>
        </div>
      ))}
    </Frame>
  ),

  SavedMessages: () => (
    <Frame className="space-y-1 p-2.5">
      {[
        "The visa slot opens at 9am — grab it early.",
        "Room 4B, not 3A.",
      ].map((m) => (
        <div
          key={m}
          className="rounded-md bg-[var(--fc-surface-2)] px-2 py-1 text-[10px]"
        >
          {m}
        </div>
      ))}
    </Frame>
  ),
};

/** Renders a live preview for a kit component, or a descriptive card. */
export function KitPreview({ name }: { name: string }) {
  const Component = previews[name];
  if (!Component) {
    return (
      <Frame className="grid h-32 place-items-center p-3 text-center">
        <p className="text-[11px] text-[var(--fc-fg-subtle)]">
          Component preview in the component gallery.
        </p>
      </Frame>
    );
  }
  return (
    <Frame className="min-h-[132px]">
      <Component />
    </Frame>
  );
}

export const KIT_PREVIEW_NAMES = Object.keys(previews);
