"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Download, Info, X } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { GeneratedArt } from "@/components/studio/GeneratedArt";
import { cn } from "@/lib/utils";
import type { MediaAttachment } from "@/lib/types";

export function MediaViewer({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: MediaAttachment[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  const [showInfo, setShowInfo] = React.useState(true);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        onIndex((index + 1) % Math.max(1, items.length));
      if (e.key === "ArrowLeft")
        onIndex((index - 1 + items.length) % Math.max(1, items.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#05070f]/96 backdrop-blur-sm">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <span className="text-[13px] font-semibold text-white">
          {item.name}
        </span>
        <Badge tone="accent">{item.kind}</Badge>
        <span className="text-[11.5px] text-white/45">{item.sizeLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className={cn(
              "grid size-9 place-items-center rounded-lg border border-white/10 text-white/70 transition-colors hover:text-white",
              showInfo ? "bg-white/10" : "bg-transparent",
            )}
            title="Details"
          >
            <Info className="size-4" />
          </button>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg border border-white/10 text-white/70 transition-colors hover:text-white"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* Stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
        {items.length > 1 && (
          <button
            onClick={() =>
              onIndex((index - 1 + items.length) % items.length)
            }
            className="absolute left-4 grid size-11 place-items-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/60"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        <div className="max-h-full max-w-4xl overflow-hidden rounded-2xl border border-white/10">
          {item.kind === "image" && item.seed?.startsWith("/api/media/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.seed} alt={item.caption ?? item.name} className="max-h-[70vh] w-auto" />
          ) : item.kind === "video" && item.seed?.startsWith("/api/media/") ? (
            <video src={item.seed} controls autoPlay className="max-h-[70vh] w-auto" />
          ) : item.kind === "image" || item.kind === "video" ? (
            <GeneratedArt
              seed={item.seed ?? item.name}
              className="max-h-[70vh] w-auto"
              label={item.caption ?? item.name}
            />
          ) : (
            <div className="grid h-[320px] w-[440px] place-items-center bg-[#0d1024] px-8 text-center">
              <div>
                <p className="text-[15px] font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-[12px] text-white/50">
                  {item.mime} · {item.sizeLabel}
                </p>
              </div>
            </div>
          )}
        </div>

        {items.length > 1 && (
          <button
            onClick={() => onIndex((index + 1) % items.length)}
            className="absolute right-4 grid size-11 place-items-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/60"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>

      {/* Info strip */}
      {showInfo && (
        <footer className="border-t border-white/10 px-4 py-3">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px]">
            {[
              ["Type", item.kind],
              ["MIME", item.mime],
              ["Size", item.sizeLabel],
              ["Dimensions",
                item.width && item.height ? `${item.width}×${item.height}` : "—"],
              ["Duration",
                item.durationSec ? `${item.durationSec}s` : "—"],
              ["Resolution", item.resolution ?? "—"],
            ].map(([l, v]) => (
              <span key={l}>
                <span className="text-white/40">{l}</span>{" "}
                <span className="font-semibold text-white/85">{v}</span>
              </span>
            ))}
            {item.caption && (
              <span className="w-full text-white/60">“{item.caption}”</span>
            )}
          </div>
        </footer>
      )}

      {/* Filmstrip */}
      {items.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-4 py-2.5">
          {items.map((it, i) => (
            <button
              key={`${it.name}-${i}`}
              onClick={() => onIndex(i)}
              className={cn(
                "size-12 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === index
                  ? "border-white"
                  : "border-transparent opacity-50 hover:opacity-90",
              )}
            >
              {it.seed?.startsWith("/api/media/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.seed} alt={it.name} className="h-full w-full object-cover" />
              ) : (
                <GeneratedArt seed={it.seed ?? it.name} className="h-full w-full" rounded={false} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
