"use client";

import * as React from "react";
import { Search } from "lucide-react";
import {
  EMOJI_CATEGORIES,
  categoriesForQuery,
  type EmojiCategory,
} from "@/lib/data/emojis";
import { cn } from "@/lib/utils";

/**
 * Categorised emoji picker used by every composer in the app.
 *
 * Kept dependency-free (no third-party emoji library) so the picker works
 * offline and ships nothing extra to the client. Categories include a
 * "Playful" pack for flirty / suggestive emoji, which this private app
 * supports explicitly.
 */
export function EmojiPicker({
  onPick,
  className,
  showSearch = true,
  initialCategory = EMOJI_CATEGORIES[0].id,
}: {
  onPick: (emoji: string) => void;
  className?: string;
  showSearch?: boolean;
  initialCategory?: string;
}) {
  const [active, setActive] = React.useState(initialCategory);
  const [query, setQuery] = React.useState("");

  const visible: EmojiCategory[] = React.useMemo(() => categoriesForQuery(query), [query]);
  const current =
    visible.find((c) => c.id === active) ?? visible[0] ?? EMOJI_CATEGORIES[0];

  return (
    <div className={cn("w-full", className)}>
      {showSearch && (
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji packs (flirty, food, hearts…)"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:border-primary"
            aria-label="Search emoji packs"
          />
        </div>
      )}

      <div className="mb-1.5 flex flex-wrap gap-1" role="tablist" aria-label="Emoji categories">
        {visible.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === current.id}
            onClick={() => setActive(c.id)}
            title={c.hint}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium transition",
              c.id === current.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-1 text-[10.5px] text-muted-foreground">{current.hint}</div>

      <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto pr-1">
        {current.emojis.map((e, i) => (
          <button
            key={`${current.id}-${e}-${i}`}
            type="button"
            onClick={() => onPick(e)}
            aria-label={`Insert ${e}`}
            className="grid size-8 place-items-center rounded-md text-lg transition hover:bg-accent"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
