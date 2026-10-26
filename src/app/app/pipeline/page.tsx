"use client";

import * as React from "react";
import {
  ArrowRight,
  CalendarClock,
  GripVertical,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress, stageMeta } from "@/components/ui/primitives";
import { FunnelChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatCurrency, sum } from "@/lib/utils";
import type { Deal, Stage } from "@/lib/types";

const boardStages: Stage[] = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

export default function PipelinePage() {
  const deals = useStore((s) => s.deals);
  const contacts = useStore((s) => s.contacts);
  const companies = useStore((s) => s.companies);
  const addDeal = useStore((s) => s.addDeal);
  const updateDeal = useStore((s) => s.updateDeal);
  const moveDeal = useStore((s) => s.moveDeal);
  const removeDeal = useStore((s) => s.removeDeal);
  const toast = useToast();

  const [dragging, setDragging] = React.useState<{ id: string; from: Stage } | null>(null);
  const [overStage, setOverStage] = React.useState<Stage | null>(null);
  const [modal, setModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Deal | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    value: 0,
    stage: "lead" as Stage,
    contactId: "",
    probability: 40,
    closeDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    notes: "",
    tags: "",
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new")) setModal(true);
  }, []);

  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const pipelineValue = sum(openDeals.map((d) => d.value));
  const weighted = sum(openDeals.map((d) => (d.value * d.probability) / 100));
  const wonValue = sum(deals.filter((d) => d.stage === "won").map((d) => d.value));

  const stageValue = (stage: Stage) =>
    sum(deals.filter((d) => d.stage === stage).map((d) => d.value));

  const onDrop = (stage: Stage) => {
    if (!dragging) return;
    if (dragging.from !== stage) {
      moveDeal(dragging.id, stage);
      const deal = deals.find((d) => d.id === dragging.id);
      toast.success(
        "Deal moved",
        `${deal?.title ?? "Deal"} → ${stageMeta[stage].label}. Activity logged automatically.`,
      );
    }
    setDragging(null);
    setOverStage(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      value: 0,
      stage: "lead",
      contactId: "",
      probability: 40,
      closeDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      notes: "",
      tags: "",
    });
    setModal(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      contactId: deal.contactId ?? "",
      probability: deal.probability,
      closeDate: deal.closeDate.slice(0, 10),
      notes: deal.notes ?? "",
      tags: deal.tags.join(", "),
    });
    setModal(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.warning("Missing title", "Give the deal a name.");
      return;
    }
    const contact = contacts.find((c) => c.id === form.contactId);
    const payload = {
      title: form.title.trim(),
      value: Number(form.value) || 0,
      stage: form.stage,
      contactId: form.contactId || undefined,
      companyId: contact ? companies.find((c) => c.name === contact.company)?.id : undefined,
      probability: Number(form.probability),
      closeDate: new Date(form.closeDate).toISOString(),
      notes: form.notes || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editing) {
      updateDeal(editing.id, payload);
      toast.success("Deal updated", payload.title);
    } else {
      addDeal(payload);
      toast.success("Deal created", `${payload.title} added to ${stageMeta[form.stage].label}.`);
    }
    setModal(false);
  };

  return (
    <div className="mx-auto max-w-[1700px]">
      <PageHeader
        eyebrow="CRM & revenue"
        title="Pipeline"
        description="Drag a card between stages and the forecast, the activity log and the contact record all update together."
        actions={
          <button onClick={openNew} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            New deal
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatCurrency(pipelineValue)}
          deltaLabel={`${openDeals.length} open opportunities`}
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Weighted forecast"
          value={formatCurrency(weighted)}
          deltaLabel="probability adjusted"
          icon={<Target className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Won"
          value={formatCurrency(wonValue)}
          deltaLabel={`${deals.filter((d) => d.stage === "won").length} deals closed`}
          icon={<TrendingUp className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Average deal"
          value={formatCurrency(
            deals.length ? Math.round(sum(deals.map((d) => d.value)) / deals.length) : 0,
          )}
          deltaLabel={`${deals.length} deals in total`}
          icon={<ArrowRight className="size-4" />}
          tone="accent"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_280px]">
        {/* ------------- BOARD ------------- */}
        <div className="fc-scroll-thin overflow-x-auto pb-2">
          <div className="flex min-w-[1180px] gap-3">
            {boardStages.map((stage) => {
              const meta = stageMeta[stage];
              const stageDeals = deals.filter((d) => d.stage === stage);
              const isOver = overStage === stage;
              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverStage(stage);
                  }}
                  onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                  onDrop={() => onDrop(stage)}
                  className={cn(
                    "flex w-[230px] shrink-0 flex-col rounded-xl border bg-[var(--fc-surface-2)] transition-colors",
                    isOver
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.06]"
                      : "border-[var(--fc-line)]",
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-[var(--fc-line)] px-3.5 py-3">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="text-[12.5px] font-bold">{meta.label}</span>
                    <span className="ml-auto rounded-md bg-[var(--fc-surface-3)] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-[var(--fc-fg-muted)]">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="px-3.5 py-2 text-[11.5px] font-semibold tabular-nums text-[var(--fc-fg-muted)]">
                    {formatCurrency(stageValue(stage))}
                  </div>

                  <div className="fc-scroll-thin flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
                    {stageDeals.map((deal) => {
                      const contact = contacts.find((c) => c.id === deal.contactId);
                      const company = companies.find((c) => c.id === deal.companyId);
                      return (
                        <article
                          key={deal.id}
                          draggable
                          onDragStart={() => setDragging({ id: deal.id, from: stage })}
                          onDragEnd={() => {
                            setDragging(null);
                            setOverStage(null);
                          }}
                          onClick={() => openEdit(deal)}
                          className={cn(
                            "group cursor-pointer rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3 shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-brand-400)] hover:shadow-[var(--shadow-md)]",
                            dragging?.id === deal.id && "opacity-40",
                          )}
                        >
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="mt-0.5 size-3.5 shrink-0 cursor-grab text-[var(--fc-fg-subtle)] opacity-0 transition-opacity group-hover:opacity-100" />
                            <h3 className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug">
                              {deal.title}
                            </h3>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5 pl-5 text-[11px] text-[var(--fc-fg-subtle)]">
                            {contact && <span className="truncate">{contact.name}</span>}
                            {company && (
                              <>
                                <span>·</span>
                                <span className="truncate">{company.name}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-2.5 flex items-center justify-between pl-5">
                            <span className="text-[13px] font-bold tabular-nums">
                              {formatCurrency(deal.value)}
                            </span>
                            <span className="text-[10.5px] font-semibold tabular-nums text-[var(--fc-fg-subtle)]">
                              {deal.probability}%
                            </span>
                          </div>
                          <div className="mt-2 pl-5">
                            <Progress
                              value={deal.probability}
                              height={4}
                              tone={stage === "won" ? "success" : stage === "lost" ? "danger" : "brand"}
                            />
                          </div>
                          <div className="mt-2.5 flex items-center gap-1 pl-5 text-[10.5px] text-[var(--fc-fg-subtle)]">
                            <CalendarClock className="size-3" />
                            {new Date(deal.closeDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </div>
                        </article>
                      );
                    })}
                    {stageDeals.length === 0 && (
                      <div className="rounded-lg border border-dashed border-[var(--fc-line)] px-3 py-6 text-center text-[11.5px] text-[var(--fc-fg-subtle)]">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ------------- SIDEBAR ------------- */}
        <div className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Stage conversion</h2>
            <div className="mt-4">
              <FunnelChart
                stages={boardStages
                  .filter((s) => s !== "lost")
                  .map((s) => ({
                    label: stageMeta[s].label,
                    value: deals.filter((d) => d.stage === s).length,
                    color: stageMeta[s].color,
                  }))}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Closing soon</h2>
            <div className="mt-3 space-y-2">
              {openDeals
                .slice()
                .sort((a, b) => +new Date(a.closeDate) - +new Date(b.closeDate))
                .slice(0, 5)
                .map((d) => {
                  const days = Math.ceil(
                    (+new Date(d.closeDate) - Date.now()) / 86_400_000,
                  );
                  return (
                    <button
                      key={d.id}
                      onClick={() => openEdit(d)}
                      className="block w-full rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5 text-left transition-colors hover:border-[var(--color-brand-400)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-medium">{d.title}</span>
                        <Badge tone={days <= 7 ? "danger" : days <= 21 ? "signal" : "neutral"}>
                          {days}d
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--fc-fg-subtle)]">
                        <span>{stageMeta[d.stage].label}</span>
                        <span className="tabular-nums">{formatCurrency(d.value)}</span>
                      </div>
                    </button>
                  );
                })}
              {openDeals.length === 0 && (
                <EmptyState title="Nothing open" description="No open opportunities." />
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit deal" : "New deal"}
        description={editing ? "Update the opportunity details." : "Add an opportunity to the board."}
        size="lg"
        footer={
          <>
            {editing && (
              <button
                onClick={() => {
                  removeDeal(editing.id);
                  setModal(false);
                  toast.info("Deal deleted", editing.title);
                }}
                className="btn btn-danger btn-sm mr-auto"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            )}
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              {editing ? "Save changes" : "Create deal"}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Deal title *</span>
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Attribution platform rollout"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Value (£)</span>
            <input
              className="field"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Stage</span>
            <select
              className="field"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}
            >
              {boardStages.map((s) => (
                <option key={s} value={s}>
                  {stageMeta[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Contact</span>
            <select
              className="field"
              value={form.contactId}
              onChange={(e) => setForm({ ...form, contactId: e.target.value })}
            >
              <option value="">No contact linked</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `— ${c.company}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Close date</span>
            <input
              className="field"
              type="date"
              value={form.closeDate}
              onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">
              Probability — {form.probability}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.probability}
              onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
              className="w-full accent-[var(--color-brand-500)]"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Notes</span>
            <textarea
              className="field min-h-[80px] resize-y"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
