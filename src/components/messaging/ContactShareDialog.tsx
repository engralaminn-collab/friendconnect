"use client";

import * as React from "react";
import { Search, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge } from "@/components/ui/primitives";
import { profileApi } from "@/lib/api/resources";
import { useMessenger } from "@/store/useMessenger";
import type { Contact } from "@/lib/types";

interface PlatformUser {
  id: string;
  email: string | null;
  displayName: string;
  handle: string | null;
}

/**
 * Real contact sharing: pick a registered FriendConnect user (live directory
 * search) or one of the saved CRM contacts. The selected identity is sent as
 * a persisted contact-card message instead of hardcoded sample data.
 */
export function ContactShareDialog({
  open,
  onClose,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  onShare: (card: { name: string; phone: string; company?: string }) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PlatformUser[]>([]);
  const [searching, setSearching] = React.useState(false);
  const contacts = useMessenger((s) => s.contacts);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { results } = await profileApi.searchUsers(q);
        setResults(results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const localMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = contacts.filter((c) => c.id);
    if (!q) return base.slice(0, 8);
    return base
      .filter(
        (c: Contact) =>
          c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [contacts, query]);

  const share = (card: { name: string; phone: string; company?: string }) => {
    onShare(card);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Share contact" description="Send a real contact card from the directory or your saved contacts." size="md">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
          <input
            className="field pl-9"
            placeholder="Search people by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {query.trim().length >= 2 &&
            results.map((u) => (
              <li key={`u-${u.id}`}>
                <button
                  onClick={() =>
                    share({ name: u.displayName, phone: u.email ?? u.handle ?? "—", company: "FriendConnect" })
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
                >
                  <Avatar name={u.displayName} hue={226} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{u.displayName}</span>
                    <span className="block truncate text-[11px] text-[var(--fc-fg-subtle)]">
                      {u.email ?? u.handle ?? "FriendConnect user"}
                    </span>
                  </span>
                  <Badge tone="brand">
                    <UserPlus className="mr-1 inline size-3" /> Send
                  </Badge>
                </button>
              </li>
            ))}

          {localMatches.map((c) => (
            <li key={`c-${c.id}`}>
              <button
                onClick={() => share({ name: c.name, phone: c.phone ?? c.email ?? "—", company: undefined })}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
              >
                <Avatar name={c.name} hue={c.avatarHue ?? 200} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{c.name}</span>
                  <span className="block truncate text-[11px] text-[var(--fc-fg-subtle)]">
                    {c.phone ?? c.email ?? "Saved contact"}
                  </span>
                </span>
                <Badge>Contact</Badge>
              </button>
            </li>
          ))}

          {query.trim().length >= 2 && !searching && results.length === 0 && localMatches.length === 0 && (
            <li className="px-2 py-6 text-center text-[12.5px] text-[var(--fc-fg-subtle)]">
              No matching people found.
            </li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
