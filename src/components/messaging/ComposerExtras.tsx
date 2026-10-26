"use client";

import * as React from "react";
import { Languages, Sparkles, Sticker } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import {
  SMART_REPLIES,
  SMART_REPLY_TONES,
  STICKER_PACKS,
  type SmartReply,
} from "@/lib/data/messagingExtras";
import { LANGUAGES, translate, type LangCode } from "@/lib/translate";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* sticker keyboard                                                     */
/* ------------------------------------------------------------------ */

export function StickerKeyboard({
  onPick,
  onClose,
}: {
  onPick: (sticker: string) => void;
  onClose: () => void;
}) {
  const [pack, setPack] = React.useState(STICKER_PACKS[0].id);
  const active = STICKER_PACKS.find((p) => p.id === pack)!;

  return (
    <div className="fc-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2">
        <Sticker className="size-3.5 text-[var(--color-brand-500)]" />
        <span className="text-[12px] font-semibold">Stickers</span>
        <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
          {active.note}
        </span>
        <button
          onClick={onClose}
          className="text-[11px] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
        >
          close
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5 p-3 sm:grid-cols-8">
        {active.stickers.map((s) => (
          <button
            key={s.id}
            title={s.label}
            onClick={() => onPick(s.emoji)}
            className="grid aspect-square place-items-center rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] text-[22px] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-brand-500)]"
          >
            {s.emoji}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-t border-[var(--fc-line)] px-3 py-2">
        {STICKER_PACKS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPack(p.id)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
              pack === p.id
                ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* smart replies                                                       */
/* ------------------------------------------------------------------ */

export function SmartReplies({
  onPick,
  onDismiss,
}: {
  onPick: (reply: SmartReply) => void;
  onDismiss: () => void;
}) {
  const [tone, setTone] = React.useState<SmartReply["tone"] | "all">("all");
  const list = SMART_REPLIES.filter((r) => tone === "all" || r.tone === tone);

  return (
    <div className="fc-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2">
        <Sparkles className="size-3.5 text-[var(--color-violet-500)]" />
        <span className="text-[12px] font-semibold">Smart replies</span>
        <div className="ml-auto flex flex-wrap gap-1">
          <button
            onClick={() => setTone("all")}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
              tone === "all"
                ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                : "text-[var(--fc-fg-muted)]",
            )}
          >
            all
          </button>
          {SMART_REPLY_TONES.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                tone === t
                  ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                  : "text-[var(--fc-fg-muted)]",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="text-[11px] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
        >
          hide
        </button>
      </div>
      <ul className="divide-y divide-[var(--fc-line)]">
        {list.slice(0, 6).map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onPick(r)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
            >
              <Badge
                tone={
                  r.tone === "professional"
                    ? "accent"
                    : r.tone === "warm"
                    ? "signal"
                    : r.tone === "brief"
                    ? "violet"
                    : "success"
                }
              >
                {r.tone}
              </Badge>
              <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed">
                {r.text}
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                {r.context}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* inline translation                                                   */
/* ------------------------------------------------------------------ */

export function TranslateInline({
  body,
  onClose,
}: {
  body: string;
  onClose: () => void;
}) {
  const [lang, setLang] = React.useState<LangCode>("bn");
  const result = React.useMemo(() => translate(body, lang), [body, lang]);
  const meta = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div className="fc-card p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Languages className="size-3.5 text-[var(--color-accent-500)]" />
        {LANGUAGES.filter((l) => l.code !== "en").map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors",
              lang === l.code
                ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
            )}
          >
            {l.flag} {l.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="ml-auto text-[11px] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
        >
          close
        </button>
      </div>

      <p
        dir={meta.rtl ? "rtl" : "ltr"}
        className="mt-2.5 text-[13.5px] leading-relaxed"
      >
        {result.text}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-[var(--fc-fg-subtle)]">
        <Badge tone={result.coverage > 0.8 ? "success" : "signal"}>
          {Math.round(result.coverage * 100)}% covered
        </Badge>
        {result.phrases > 0 && (
          <span>
            {result.phrases} phrase{result.phrases === 1 ? "" : "s"} matched
          </span>
        )}
        {result.unknown.length > 0 && (
          <span className="text-[var(--color-signal-500)]">
            {result.unknown.length} word{result.unknown.length === 1 ? "" : "s"} not in
            the offline pack
          </span>
        )}
      </div>
    </div>
  );
}
