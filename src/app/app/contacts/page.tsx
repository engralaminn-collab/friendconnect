"use client";

import * as React from "react";
import {
  Download,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  DataTableShell,
  FilterChip,
  PageHeader,
  Td,
  Th,
  Toolbar,
} from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, EmptyState, StageBadge, stageMeta } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import {
  cn,
  downloadFile,
  formatCurrency,
  relativeTime,
} from "@/lib/utils";
import type { Contact, Stage } from "@/lib/types";

const stages: Stage[] = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  title: "",
  country: "",
  city: "",
  stage: "lead" as Stage,
  value: 0,
  source: "Webinar",
  owner: "Maya Rahman",
  notes: "",
  tags: "",
};

export default function ContactsPage() {
  const contacts = useStore((s) => s.contacts);
  const deals = useStore((s) => s.deals);
  const addContact = useStore((s) => s.addContact);
  const updateContact = useStore((s) => s.updateContact);
  const removeContact = useStore((s) => s.removeContact);
  const toggleStar = useStore((s) => s.toggleContactStar);
  const moveStage = useStore((s) => s.moveContactStage);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<Stage | "all">("all");
  const [sortKey, setSortKey] = React.useState<"name" | "value" | "stage" | "lastContact">(
    "lastContact",
  );
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [detail, setDetail] = React.useState<Contact | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new")) setModalOpen(true);
    const focus = params.get("focus");
    if (focus) {
      const c = contacts.find((x) => x.id === focus);
      if (c) setDetail(c);
    }
  }, [contacts]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = contacts.filter((c) => {
      const matchesStage = stageFilter === "all" || c.stage === stageFilter;
      if (!matchesStage) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list = list.slice().sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "value":
          return (a.value - b.value) * dir;
        case "stage":
          return stages.indexOf(a.stage) - stages.indexOf(b.stage) * dir;
        default:
          return (new Date(a.lastContact).getTime() - new Date(b.lastContact).getTime()) * dir;
      }
    });
    return list;
  }, [contacts, query, stageFilter, sortKey, sortDir]);

  const setSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.warning("Missing details", "Name and email are required.");
      return;
    }
    addContact({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone || undefined,
      company: form.company || undefined,
      title: form.title || undefined,
      country: form.country || undefined,
      city: form.city || undefined,
      stage: form.stage,
      value: Number(form.value) || 0,
      source: form.source,
      owner: form.owner,
      notes: form.notes || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setModalOpen(false);
    toast.success("Contact created", `${form.name} added to the CRM.`);
  };

  const exportCsv = () => {
    const header = "name,email,phone,company,title,country,stage,value,source,owner,tags";
    const rows = filtered.map((c) =>
      [
        c.name,
        c.email,
        c.phone ?? "",
        c.company ?? "",
        c.title ?? "",
        c.country ?? "",
        c.stage,
        c.value,
        c.source,
        c.owner,
        c.tags.join("|"),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    downloadFile("friendconnect-contacts.csv", [header, ...rows].join("\n"));
    toast.success("Export ready", `${filtered.length} contacts exported.`);
  };

  const detailDeals = detail ? deals.filter((d) => d.contactId === detail.id) : [];

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="CRM & revenue"
        title="Contacts"
        description="Every person you sell to, in one enriched record. Filter, stage and export without touching a spreadsheet."
        actions={
          <>
            <button onClick={exportCsv} className="btn btn-secondary btn-sm">
              <Download className="size-3.5" />
              Export
            </button>
            <button onClick={openNew} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              New contact
            </button>
          </>
        }
      />

      <Toolbar>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
          <input
            className="field pl-9"
            placeholder="Search name, email, company or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <FilterChip active={stageFilter === "all"} onClick={() => setStageFilter("all")}>
          All
          <span className="ml-0.5">{contacts.length}</span>
        </FilterChip>
        {stages.map((s) => (
          <FilterChip
            key={s}
            active={stageFilter === s}
            onClick={() => setStageFilter(stageFilter === s ? "all" : s)}
            count={contacts.filter((c) => c.stage === s).length}
          >
            {stageMeta[s].label}
          </FilterChip>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-[var(--fc-fg-subtle)]">
          <Filter className="size-3.5" />
          {filtered.length} shown
        </span>
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title="No contacts match"
          description="Adjust the search or clear the stage filter."
          action={
            <button
              onClick={() => {
                setQuery("");
                setStageFilter("all");
              }}
              className="btn btn-secondary btn-sm"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <DataTableShell>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[var(--fc-surface-2)]">
                <tr>
                  <Th className="w-10"></Th>
                  <Th onClick={() => setSort("name")}>Contact</Th>
                  <Th>Company</Th>
                  <Th onClick={() => setSort("stage")}>Stage</Th>
                  <Th onClick={() => setSort("value")} align="right">
                    Value
                  </Th>
                  <Th>Source</Th>
                  <Th>Owner</Th>
                  <Th onClick={() => setSort("lastContact")}>Last touch</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fc-line)]">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="group transition-colors hover:bg-[var(--fc-surface-2)]"
                  >
                    <Td>
                      <button
                        onClick={() => toggleStar(c.id)}
                        aria-label="Star contact"
                        className="text-[var(--fc-fg-subtle)] transition-colors hover:text-[var(--color-signal-500)]"
                      >
                        <Star
                          className={cn(
                            "size-4",
                            c.starred && "fill-[var(--color-signal-500)] text-[var(--color-signal-500)]",
                          )}
                        />
                      </button>
                    </Td>
                    <Td>
                      <button
                        onClick={() => setDetail(c)}
                        className="flex items-center gap-3 text-left"
                      >
                        <Avatar name={c.name} hue={c.avatarHue} size={34} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.name}</span>
                          <span className="block truncate text-[11.5px] text-[var(--fc-fg-subtle)]">
                            {c.email}
                          </span>
                        </span>
                      </button>
                    </Td>
                    <Td>
                      <span className="block truncate text-[13px]">{c.company ?? "—"}</span>
                      <span className="block truncate text-[11.5px] text-[var(--fc-fg-subtle)]">
                        {c.title ?? c.city ?? ""}
                      </span>
                    </Td>
                    <Td>
                      <StageBadge stage={c.stage} />
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c.value ? formatCurrency(c.value) : "—"}
                    </Td>
                    <Td>
                      <span className="text-[12.5px] text-[var(--fc-fg-muted)]">{c.source}</span>
                    </Td>
                    <Td>
                      <span className="text-[12.5px] text-[var(--fc-fg-muted)]">{c.owner}</span>
                    </Td>
                    <Td>
                      <span className="text-[12.5px] text-[var(--fc-fg-muted)]">
                        {relativeTime(c.lastContact)}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <a
                          href={`mailto:${c.email}`}
                          className="btn btn-ghost btn-icon size-8"
                          title="Email"
                        >
                          <Mail className="size-3.5" />
                        </a>
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="btn btn-ghost btn-icon size-8" title="Call">
                            <Phone className="size-3.5" />
                          </a>
                        )}
                        <select
                          value={c.stage}
                          onChange={(e) => moveStage(c.id, e.target.value as Stage)}
                          className="field h-8 w-[110px] py-0 text-[11.5px]"
                          title="Change stage"
                        >
                          {stages.map((s) => (
                            <option key={s} value={s}>
                              {stageMeta[s].label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            removeContact(c.id);
                            toast.info("Contact removed", `${c.name} deleted.`);
                          }}
                          className="btn btn-ghost btn-icon size-8 text-rose-500"
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataTableShell>
      )}

      {/* ---------- Create modal ---------- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New contact"
        description="Add a person to the CRM. You can enrich them later."
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Create contact
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Full name *</span>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Alex Morgan"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Email *</span>
            <input
              className="field"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alex@company.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Company</span>
            <input
              className="field"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Job title</span>
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Phone</span>
            <input
              className="field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+44 7700 900000"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Country</span>
            <input
              className="field"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Stage</span>
            <select
              className="field"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}
            >
              {stages.map((s) => (
                <option key={s} value={s}>
                  {stageMeta[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Deal value (£)</span>
            <input
              className="field"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Source</span>
            <input
              className="field"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Owner</span>
            <input
              className="field"
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Tags (comma separated)</span>
            <input
              className="field"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="enterprise, inbound"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Notes</span>
            <textarea
              className="field min-h-[90px] resize-y"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      {/* ---------- Detail drawer ---------- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? `${detail.title ?? "Contact"} · ${detail.company ?? "Independent"}` : ""}
        size="md"
        footer={
          <button onClick={() => setDetail(null)} className="btn btn-secondary btn-sm">
            <X className="size-3.5" />
            Close
          </button>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={detail.name} hue={detail.avatarHue} size={54} />
              <div className="min-w-0">
                <StageBadge stage={detail.stage} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              {[
                { l: "Email", v: detail.email },
                { l: "Phone", v: detail.phone ?? "—" },
                { l: "Location", v: [detail.city, detail.country].filter(Boolean).join(", ") || "—" },
                { l: "Value", v: detail.value ? formatCurrency(detail.value) : "—" },
                { l: "Source", v: detail.source },
                { l: "Owner", v: detail.owner },
                { l: "Added", v: relativeTime(detail.createdAt) },
                { l: "Last touch", v: relativeTime(detail.lastContact) },
              ].map((row) => (
                <div key={row.l} className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    {row.l}
                  </dt>
                  <dd className="mt-1 truncate text-[13px] font-medium">{row.v}</dd>
                </div>
              ))}
            </dl>

            {detail.notes && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Notes
                </h3>
                <p className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {detail.notes}
                </p>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Move stage
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {stages.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      moveStage(detail.id, s);
                      setDetail({ ...detail, stage: s });
                    }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      detail.stage === s
                        ? "text-white"
                        : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
                    )}
                    style={
                      detail.stage === s
                        ? { backgroundColor: stageMeta[s].color }
                        : undefined
                    }
                  >
                    {stageMeta[s].label}
                  </button>
                ))}
              </div>
            </div>

            {detailDeals.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Associated deals
                </h3>
                <div className="space-y-2">
                  {detailDeals.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3.5 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <TrendingUp className="size-3.5 text-[var(--color-brand-500)]" />
                        {d.title}
                      </span>
                      <span className="text-[12.5px] tabular-nums text-[var(--fc-fg-muted)]">
                        {formatCurrency(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
