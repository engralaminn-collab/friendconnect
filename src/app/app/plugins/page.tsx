"use client";

import * as React from "react";
import Link from "next/link";
import {
  Blocks,
  Check,
  Download,
  ExternalLink,
  Package,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { BarChart, DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatNumber } from "@/lib/utils";
import type { Plugin } from "@/lib/types";

export default function PluginsPage() {
  const plugins = useStore((s) => s.plugins);
  const togglePlugin = useStore((s) => s.togglePlugin);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [scope, setScope] = React.useState<"all" | "installed">("all");

  const categories = Array.from(new Set(plugins.map((p) => p.category)));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return plugins.filter((p) => {
      if (scope === "installed" && !p.installed) return false;
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [plugins, query, category, scope]);

  const installed = plugins.filter((p) => p.installed);
  const totalDownloads = plugins.reduce((a, p) => a + p.downloads, 0);

  const categoryData = categories.map((c) => ({
    label: c,
    value: plugins.filter((p) => p.category === c).length,
  }));

  const topDownloads = plugins
    .slice()
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 7)
    .map((p) => ({ label: p.name.split(" ")[0], value: p.downloads }));

  const install = (p: Plugin) => {
    togglePlugin(p.id);
    toast.success(
      p.installed ? `${p.name} removed` : `${p.name} installed`,
      p.installed
        ? "Its tools are no longer available to your agents."
        : "Its tools are now available to your agents and the API bench.",
    );
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Extend"
        title="Plugin marketplace"
        description="Every plugin adds tools to your agents, blocks to your studios and endpoints to your bench. Install, uninstall, never pay per feature."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Plugins"
          value={plugins.length}
          deltaLabel={`${installed.length} installed`}
          icon={<Blocks className="size-4" />}
        />
        <StatCard
          label="Downloads"
          value={formatNumber(totalDownloads)}
          deltaLabel="across the marketplace"
          icon={<Download className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Average rating"
          value={(plugins.reduce((a, p) => a + p.rating, 0) / plugins.length).toFixed(1)}
          deltaLabel="out of 5"
          icon={<Star className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Authors"
          value={new Set(plugins.map((p) => p.author)).size}
          deltaLabel="third-party contributors"
          icon={<Package className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search plugins…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterChip
              active={scope === "all"}
              onClick={() => setScope(scope === "all" ? "installed" : "all")}
            >
              All
            </FilterChip>
            <FilterChip
              active={scope === "installed"}
              onClick={() => setScope(scope === "installed" ? "all" : "installed")}
              count={installed.length}
            >
              Installed
            </FilterChip>
            {categories.map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? "all" : c)}
                count={plugins.filter((p) => p.category === c).length}
              >
                {c}
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Blocks className="size-6" />}
              title="No plugins match"
              description="Try a different filter."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <article key={p.id} className="fc-card fc-card-hover flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                      <Blocks className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[14.5px] font-semibold">{p.name}</h3>
                        {p.featured && <Badge tone="signal">Featured</Badge>}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                        by {p.author} · v{p.version}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {p.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3 border-t border-[var(--fc-line)] pt-3.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-[var(--color-signal-500)] text-[var(--color-signal-500)]" />
                      {p.rating}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="size-3" />
                      {formatNumber(p.downloads)}
                    </span>
                    <button
                      onClick={() => install(p)}
                      className={cn(
                        "btn btn-sm ml-auto",
                        p.installed ? "btn-secondary" : "btn-primary",
                      )}
                    >
                      {p.installed ? (
                        <>
                          <Check className="size-3.5" />
                          Installed
                        </>
                      ) : (
                        <>
                          <Download className="size-3.5" />
                          Install
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
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
                centerLabel="Plugins"
                centerValue={String(plugins.length)}
                data={categoryData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <TrendingUp className="size-4 text-[var(--color-accent-500)]" />
              Most installed
            </h2>
            <div className="mt-4">
              <BarChart
                height={190}
                labels={topDownloads.map((t) => t.label)}
                series={[{ name: "Downloads", data: topDownloads.map((t) => t.value) }]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <ShieldCheck className="size-4 text-emerald-500" />
              Plugin security
            </h2>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {[
                "Plugins declare the exact tools they expose before you install.",
                "Nothing runs until you grant the permission.",
                "You can revoke a plugin without losing the data it produced.",
                "Third-party plugins are sandboxed and reviewed before listing.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {r}
                </li>
              ))}
            </ul>
            <Link
              href="/app/skills"
              className="btn btn-secondary btn-sm mt-4 w-full"
            >
              <ExternalLink className="size-3.5" />
              Publish a plugin
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
