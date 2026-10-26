"use client";

import * as React from "react";
import {
  CheckCircle2,
  Copy,
  Cpu,
  KeyRound,
  Play,
  Plug,
  Search,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard } from "@/lib/utils";
import type { ApiDefinition } from "@/lib/types";

const authMeta: Record<
  ApiDefinition["auth"],
  { label: string; icon: React.ElementType; tone: "neutral" | "brand" | "signal" | "danger" }
> = {
  none: { label: "No auth", icon: ShieldCheck, tone: "neutral" },
  "api-key": { label: "API key", icon: KeyRound, tone: "brand" },
  oauth2: { label: "OAuth 2", icon: ShieldCheck, tone: "signal" },
  basic: { label: "Basic", icon: ShieldCheck, tone: "danger" },
};

export default function APIsPage() {
  const apis = useStore((s) => s.apis);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [bench, setBench] = React.useState<ApiDefinition | null>(null);
  const [method, setMethod] = React.useState("GET");
  const [path, setPath] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [response, setResponse] = React.useState<{
    status: number;
    ms: number;
    body: string;
  } | null>(null);

  const categories = Array.from(new Set(apis.map((a) => a.category)));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return apis.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [apis, query, category]);

  const categoryData = categories.map((c) => ({
    label: c,
    value: apis.filter((a) => a.category === c).length,
  }));

  const openBench = (a: ApiDefinition) => {
    setBench(a);
    setMethod("GET");
    setPath(a.url);
    setResponse(null);
  };

  const send = () => {
    if (!bench) return;
    setSending(true);
    setResponse(null);
    const ms = 120 + Math.round(Math.random() * 700);
    setTimeout(() => {
      const status = Math.random() > 0.14 ? 200 : 429;
      const body =
        status === 200
          ? JSON.stringify(
              {
                object: "list",
                data: [
                  { id: "obj_8fa21", name: "Sample record", created: 1721808000 },
                  { id: "obj_3bc09", name: "Second record", created: 1721894400 },
                ],
                has_more: false,
              },
              null,
              2,
            )
          : JSON.stringify(
              {
                error: {
                  type: "rate_limit_exceeded",
                  message: "Too many requests. Retry in 12 seconds.",
                },
              },
              null,
              2,
            );
      setResponse({ status, ms, body });
      setSending(false);
      toast[status === 200 ? "success" : "warning"](
        status === 200 ? `200 OK in ${ms}ms` : `429 in ${ms}ms`,
        status === 200 ? "Request completed." : "Rate limited — the bench simulates this.",
      );
    }, 700);
  };

  const noAuth = apis.filter((a) => a.auth === "none").length;
  const corsEnabled = apis.filter((a) => a.cors).length;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Developer"
        title="API directory"
        description="Curated public APIs with authentication, CORS and rating metadata — plus a bench that fires test requests from the browser."
        actions={
          <button
            onClick={() => openBench(apis[0])}
            className="btn btn-primary btn-sm"
            disabled={!apis[0]}
          >
            <Terminal className="size-3.5" />
            Open bench
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="APIs"
          value={apis.length}
          deltaLabel={`${categories.length} categories`}
          icon={<Plug className="size-4" />}
        />
        <StatCard
          label="No auth required"
          value={noAuth}
          deltaLabel="usable immediately"
          icon={<ShieldCheck className="size-4" />}
          tone="success"
        />
        <StatCard
          label="CORS enabled"
          value={corsEnabled}
          deltaLabel="callable from the browser"
          icon={<Zap className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Average rating"
          value={(apis.reduce((a, x) => a + x.rating, 0) / apis.length).toFixed(1)}
          deltaLabel="out of 5"
          icon={<CheckCircle2 className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search APIs by name, description or tag…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
              All
            </FilterChip>
            {categories.map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? "all" : c)}
                count={apis.filter((a) => a.category === c).length}
              >
                {c}
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Plug className="size-6" />}
              title="No APIs match"
              description="Try a broader search."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((a) => {
                const auth = authMeta[a.auth];
                const AuthIcon = auth.icon;
                return (
                  <article key={a.id} className="fc-card fc-card-hover flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-accent-400))] text-white">
                        <Plug className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-semibold">{a.name}</h3>
                          <Badge tone={auth.tone}>
                            <AuthIcon className="size-2.5" />
                            {auth.label}
                          </Badge>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-[var(--fc-fg-subtle)]">
                          {a.url}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-[16px] font-bold tabular-nums">
                          {a.rating}
                        </div>
                        <div className="text-[10px] text-[var(--fc-fg-subtle)]">
                          {a.reviews.toLocaleString()} reviews
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 flex-1 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {a.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.tags.map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-[var(--fc-line)] pt-3.5">
                      <Badge tone={a.https ? "success" : "danger"}>
                        {a.https ? "HTTPS" : "HTTP"}
                      </Badge>
                      <Badge tone={a.cors ? "brand" : "neutral"}>
                        {a.cors ? "CORS" : "No CORS"}
                      </Badge>
                      <button
                        onClick={() => openBench(a)}
                        className="btn btn-secondary btn-sm ml-auto"
                      >
                        <Play className="size-3.5" />
                        Test
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Category mix</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="APIs"
                centerValue={String(apis.length)}
                data={categoryData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Cpu className="size-4 text-[var(--color-accent-500)]" />
              How the bench works
            </h2>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {[
                "Requests are simulated locally — nothing leaves your browser.",
                "Latency is sampled from a realistic distribution.",
                "A 429 is injected occasionally so you can see the failure path.",
                "Copy the endpoint and paste it into your own client to go live.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* ---------- Bench ---------- */}
      <Modal
        open={!!bench}
        onClose={() => setBench(null)}
        title={bench ? `${bench.name} — request bench` : ""}
        description={bench?.description}
        size="lg"
        footer={
          <>
            <button onClick={() => setBench(null)} className="btn btn-ghost btn-sm">
              Close
            </button>
            <button onClick={send} disabled={sending} className="btn btn-primary btn-sm">
              {sending ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Play className="size-3.5" />
              )}
              {sending ? "Sending…" : "Send request"}
            </button>
          </>
        }
      >
        {bench && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="field w-auto"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input
                className="field flex-1 font-mono text-[12.5px]"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
              <button
                onClick={async () => {
                  const ok = await copyToClipboard(`${method} ${path}`);
                  toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                }}
                className="btn btn-secondary"
              >
                <Copy className="size-3.5" />
              </button>
            </div>

            <div className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Metadata
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={bench.https ? "success" : "danger"}>
                  {bench.https ? "HTTPS" : "HTTP"}
                </Badge>
                <Badge tone={bench.cors ? "brand" : "neutral"}>
                  {bench.cors ? "CORS enabled" : "CORS blocked"}
                </Badge>
                <Badge>{authMeta[bench.auth].label}</Badge>
                <Badge tone="accent">★ {bench.rating}</Badge>
              </div>
              <p className="mt-2 text-[12px] text-[var(--fc-fg-muted)]">
                {bench.tags.join(" · ")}
              </p>
            </div>

            {response ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone={response.status === 200 ? "success" : "signal"}>
                    {response.status}
                  </Badge>
                  <span className="text-[12px] tabular-nums text-[var(--fc-fg-muted)]">
                    {response.ms}ms
                  </span>
                </div>
                <pre className="fc-scroll-thin max-h-64 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[#0d1024] p-4 font-mono text-[12px] leading-relaxed text-emerald-300">
                  {response.body}
                </pre>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--fc-line)] px-4 py-10 text-center text-[13px] text-[var(--fc-fg-muted)]">
                {sending
                  ? "Sending request…"
                  : "Send the request to see the simulated response."}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
