"use client";

import * as React from "react";
import {
  BarChart3,
  Mail,
  Megaphone,
  Pause,
  Play,
  Plus,
  Radio,
  Send,
  Smartphone,
  Target,
  TrendingUp,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { BarChart, DonutChart, FunnelChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatCurrency, formatDate, sum } from "@/lib/utils";
import type { Campaign } from "@/lib/types";

const channelMeta: Record<
  Campaign["channel"],
  { label: string; icon: React.ElementType; color: string }
> = {
  email: { label: "Email", icon: Mail, color: "#3b64f6" },
  social: { label: "Social", icon: Megaphone, color: "#14b8a6" },
  ads: { label: "Ads", icon: Target, color: "#f59e0b" },
  webinar: { label: "Webinar", icon: Radio, color: "#8b5cf6" },
  sms: { label: "SMS", icon: Smartphone, color: "#ef4444" },
};

const statusTone = {
  draft: "neutral",
  scheduled: "brand",
  running: "success",
  paused: "signal",
  complete: "accent",
} as const;

export default function CampaignsPage() {
  const campaigns = useStore((s) => s.campaigns);
  const updateCampaign = useStore((s) => s.updateCampaign);
  const addCampaign = useStore((s) => s.addCampaign);
  const toast = useToast();

  const [filter, setFilter] = React.useState<Campaign["channel"] | "all">("all");
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    channel: "email" as Campaign["channel"],
    audience: "",
    budget: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    subject: "",
    body: "",
  });

  const filtered = React.useMemo(
    () => (filter === "all" ? campaigns : campaigns.filter((c) => c.channel === filter)),
    [campaigns, filter],
  );

  const totalSent = sum(campaigns.map((c) => c.sent));
  const totalOpened = sum(campaigns.map((c) => c.opened));
  const totalClicked = sum(campaigns.map((c) => c.clicked));
  const totalConverted = sum(campaigns.map((c) => c.converted));
  const totalBudget = sum(campaigns.map((c) => c.budget));

  const channelData = (Object.keys(channelMeta) as Campaign["channel"][]).map((ch) => ({
    label: channelMeta[ch].label,
    value: campaigns.filter((c) => c.channel === ch).reduce((a, c) => a + c.converted, 0),
    color: channelMeta[ch].color,
  }));

  const spendData = campaigns
    .filter((c) => c.sent > 0)
    .slice(0, 8)
    .map((c) => ({ label: c.name.split(" ")[0], value: c.sent }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning("Missing name", "Name the campaign.");
      return;
    }
    addCampaign({
      name: form.name.trim(),
      channel: form.channel,
      status: "draft",
      audience: form.audience || "Untargeted",
      sent: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      budget: Number(form.budget) || 0,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      subject: form.subject || undefined,
      body: form.body || undefined,
    });
    setModal(false);
    toast.success("Campaign created", `${form.name} is in draft.`);
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="AI marketing"
        title="Campaigns"
        description="Email, ads, webinars and SMS on one board — with funnel math, cost per conversation and channel comparison without exporting anything."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            New campaign
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Messages sent"
          value={totalSent.toLocaleString()}
          deltaLabel="across every channel"
          icon={<Send className="size-4" />}
        />
        <StatCard
          label="Open rate"
          value={`${totalSent ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0"}%`}
          deltaLabel={`${totalOpened.toLocaleString()} opens`}
          icon={<Mail className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Conversions"
          value={totalConverted.toLocaleString()}
          deltaLabel={`${totalSent ? ((totalConverted / totalSent) * 100).toFixed(2) : "0"}% of sends`}
          icon={<TrendingUp className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Total budget"
          value={formatCurrency(totalBudget)}
          deltaLabel={`${formatCurrency(
            totalBudget / Math.max(1, totalConverted),
          )} per conversion`}
          icon={<BarChart3 className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All channels
        </FilterChip>
        {(Object.keys(channelMeta) as Campaign["channel"][]).map((ch) => (
          <FilterChip
            key={ch}
            active={filter === ch}
            onClick={() => setFilter(filter === ch ? "all" : ch)}
            count={campaigns.filter((c) => c.channel === ch).length}
          >
            {channelMeta[ch].label}
          </FilterChip>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="size-6" />}
              title="No campaigns"
              description="Create one to get started."
            />
          ) : (
            filtered.map((c) => {
              const meta = channelMeta[c.channel];
              const Icon = meta.icon;
              const openRate = c.sent ? (c.opened / c.sent) * 100 : 0;
              const clickRate = c.sent ? (c.clicked / c.sent) * 100 : 0;
              const convRate = c.sent ? (c.converted / c.sent) * 100 : 0;
              const cost = c.converted ? c.budget / c.converted : 0;
              return (
                <article key={c.id} className="fc-card p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${meta.color}, color-mix(in oklab, ${meta.color} 60%, #111))`,
                      }}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14.5px] font-semibold">{c.name}</h3>
                        <Badge tone={statusTone[c.status]} dot>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-[12px] text-[var(--fc-fg-muted)]">
                        {c.audience} · {formatDate(c.startDate)} → {formatDate(c.endDate)}
                      </div>
                      {c.subject && (
                        <div className="mt-1.5 truncate text-[12px] text-[var(--fc-fg-subtle)]">
                          Subject: {c.subject}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => {
                          const next = c.status === "running" ? "paused" : "running";
                          updateCampaign(c.id, { status: next });
                          toast.info(
                            next === "running" ? "Campaign resumed" : "Campaign paused",
                            c.name,
                          );
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        {c.status === "running" ? (
                          <>
                            <Pause className="size-3.5" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="size-3.5" /> Resume
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { l: "Sent", v: c.sent.toLocaleString() },
                      { l: "Opened", v: `${openRate.toFixed(1)}%` },
                      { l: "Clicked", v: `${clickRate.toFixed(1)}%` },
                      { l: "Converted", v: c.converted.toLocaleString() },
                    ].map((m) => (
                      <div
                        key={m.l}
                        className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                          {m.l}
                        </div>
                        <div className="mt-0.5 font-display text-[16px] font-bold tabular-nums">
                          {m.v}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
                    <div className="space-y-2">
                      {[
                        { l: "Opened", v: openRate },
                        { l: "Clicked", v: clickRate },
                        { l: "Converted", v: convRate },
                      ].map((r) => (
                        <div key={r.l}>
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="text-[var(--fc-fg-subtle)]">{r.l}</span>
                            <span className="tabular-nums font-semibold">
                              {r.v.toFixed(2)}%
                            </span>
                          </div>
                          <Progress value={Math.min(100, r.v * 4)} height={5} />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                      {[
                        { l: "Budget", v: formatCurrency(c.budget) },
                        { l: "Cost / conversion", v: cost ? formatCurrency(cost) : "—" },
                        { l: "Duration", v: `${Math.max(1, Math.round((+new Date(c.endDate) - +new Date(c.startDate)) / 86_400_000))} days` },
                      ].map((r) => (
                        <div
                          key={r.l}
                          className="flex items-center justify-between text-[12px]"
                        >
                          <span className="text-[var(--fc-fg-muted)]">{r.l}</span>
                          <span className="font-semibold tabular-nums">{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Channel mix</h2>
            <p className="text-[12px] text-[var(--fc-fg-muted)]">Conversions by channel</p>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Conversions"
                centerValue={String(totalConverted)}
                data={channelData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Reach by campaign</h2>
            <div className="mt-4">
              <BarChart
                height={190}
                labels={spendData.map((s) => s.label)}
                series={[{ name: "Sent", data: spendData.map((s) => s.value) }]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Overall funnel</h2>
            <div className="mt-4">
              <FunnelChart
                stages={[
                  { label: "Reached", value: totalSent },
                  { label: "Opened", value: totalOpened },
                  { label: "Clicked", value: totalClicked },
                  { label: "Converted", value: totalConverted },
                ]}
              />
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New campaign"
        description="Set the shape of it now — the audience and copy can change right up to launch."
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Create campaign
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Campaign name *</span>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Channel</span>
            <select
              className="field"
              value={form.channel}
              onChange={(e) =>
                setForm({ ...form, channel: e.target.value as Campaign["channel"] })
              }
            >
              {(Object.keys(channelMeta) as Campaign["channel"][]).map((ch) => (
                <option key={ch} value={ch}>
                  {channelMeta[ch].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Audience</span>
            <input
              className="field"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              placeholder="Ops leaders"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Budget (£)</span>
            <input
              className="field"
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Start</span>
            <input
              className="field"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">End</span>
            <input
              className="field"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Subject line</span>
            <input
              className="field"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Body</span>
            <textarea
              className="field min-h-[100px] resize-y"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
