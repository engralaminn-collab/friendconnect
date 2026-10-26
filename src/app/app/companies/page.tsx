"use client";

import * as React from "react";
import { Building2, Globe2, Plus, Search, Users, Wallet } from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatCurrency, formatNumber, sum } from "@/lib/utils";

export default function CompaniesPage() {
  const companies = useStore((s) => s.companies);
  const contacts = useStore((s) => s.contacts);
  const deals = useStore((s) => s.deals);
  const addCompany = useStore((s) => s.addCompany);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    domain: "",
    industry: "",
    size: "",
    country: "",
    employees: 0,
    revenue: 0,
    description: "",
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.domain ?? "").toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q),
    );
  }, [companies, query]);

  const industryData = React.useMemo(() => {
    const map = new Map<string, number>();
    companies.forEach((c) => {
      const k = c.industry ?? "Other";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [companies]);

  const totalRevenue = sum(companies.map((c) => c.revenue ?? 0));
  const totalEmployees = sum(companies.map((c) => c.employees ?? 0));

  const contactsFor = (companyId: string) =>
    contacts.filter((c) =>
      companies.find((co) => co.name === c.company)?.id === companyId,
    );
  const dealsFor = (companyId: string) =>
    deals.filter((d) => d.companyId === companyId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning("Missing name", "An account needs a name.");
      return;
    }
    addCompany({
      name: form.name.trim(),
      domain: form.domain || undefined,
      industry: form.industry || undefined,
      size: form.size || undefined,
      country: form.country || undefined,
      employees: Number(form.employees) || undefined,
      revenue: Number(form.revenue) || undefined,
      description: form.description || undefined,
    });
    setModal(false);
    setForm({
      name: "",
      domain: "",
      industry: "",
      size: "",
      country: "",
      employees: 0,
      revenue: 0,
      description: "",
    });
    toast.success("Account created", `${form.name} added.`);
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="CRM & revenue"
        title="Companies"
        description="Accounts with the firmographics that let you qualify fast — size, sector, geography and the revenue already attached."
        actions={
          <button
            onClick={() => setModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus className="size-3.5" />
            New account
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Accounts"
          value={companies.length}
          deltaLabel="tracked in the CRM"
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label="Combined revenue"
          value={formatCurrency(totalRevenue)}
          deltaLabel={`${formatNumber(totalEmployees)} employees`}
          icon={<Wallet className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Open pipeline"
          value={formatCurrency(
            sum(
              deals
                .filter((d) => d.stage !== "won" && d.stage !== "lost")
                .map((d) => d.value),
            ),
          )}
          deltaLabel="across all accounts"
          icon={<Wallet className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Countries"
          value={new Set(companies.map((c) => c.country)).size}
          deltaLabel="operating regions"
          icon={<Globe2 className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
            <input
              className="field pl-9"
              placeholder="Search accounts by name, domain, industry or country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-6" />}
              title="No accounts match"
              description="Try a broader search term."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((co) => {
                const coContacts = contactsFor(co.id);
                const coDeals = dealsFor(co.id);
                const pipeline = sum(
                  coDeals
                    .filter((d) => d.stage !== "won" && d.stage !== "lost")
                    .map((d) => d.value),
                );
                const won = sum(
                  coDeals.filter((d) => d.stage === "won").map((d) => d.value),
                );
                return (
                  <article key={co.id} className="fc-card fc-card-hover flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                        style={{
                          backgroundImage: `linear-gradient(135deg, hsl(${co.logoHue} 72% 52%), hsl(${
                            (co.logoHue + 42) % 360
                          } 74% 44%))`,
                        }}
                      >
                        {co.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold">{co.name}</h3>
                        <div className="mt-0.5 truncate text-[12px] text-[var(--fc-fg-subtle)]">
                          {co.domain ?? "No domain"} · {co.country}
                        </div>
                      </div>
                      <Badge tone="brand">{co.industry}</Badge>
                    </div>

                    {co.description && (
                      <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {co.description}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { l: "Size", v: co.size ?? "—" },
                        { l: "Staff", v: co.employees ? formatNumber(co.employees) : "—" },
                        { l: "Revenue", v: co.revenue ? formatCurrency(co.revenue) : "—" },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-2"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--fc-fg-subtle)]">
                            {s.l}
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] font-semibold">
                            {s.v}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-[var(--fc-line)] pt-4">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="flex items-center gap-1.5 text-[var(--fc-fg-muted)]">
                          <Users className="size-3.5" /> Contacts
                        </span>
                        <span className="font-semibold tabular-nums">{coContacts.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-[var(--fc-fg-muted)]">Open pipeline</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(pipeline)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-[var(--fc-fg-muted)]">Closed won</span>
                        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(won)}
                        </span>
                      </div>
                      {pipeline + won > 0 && (
                        <div className="pt-1">
                          <Progress
                            value={(won / (pipeline + won)) * 100}
                            tone="success"
                            height={5}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Industry mix</h2>
            <p className="text-[12px] text-[var(--fc-fg-muted)]">
              Where your accounts sit
            </p>
            <div className="mt-4">
              <DonutChart
                size={160}
                thickness={24}
                centerLabel="Accounts"
                centerValue={String(companies.length)}
                data={industryData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Largest accounts</h2>
            <div className="mt-4 space-y-3">
              {companies
                .slice()
                .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
                .slice(0, 6)
                .map((co) => (
                  <div key={co.id}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="truncate font-medium">{co.name}</span>
                      <span className="tabular-nums text-[var(--fc-fg-muted)]">
                        {co.revenue ? formatCurrency(co.revenue) : "—"}
                      </span>
                    </div>
                    <Progress
                      value={((co.revenue ?? 0) / Math.max(1, totalRevenue)) * 100 * 3}
                      tone="accent"
                      height={5}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New account"
        description="Capture the firmographics that make qualification fast."
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Create account
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Company name *</span>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Domain</span>
            <input
              className="field"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              placeholder="company.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Industry</span>
            <input
              className="field"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Company size</span>
            <select
              className="field"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            >
              <option value="">Select…</option>
              {["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
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
            <span className="mb-1.5 block text-[12.5px] font-semibold">Employees</span>
            <input
              className="field"
              type="number"
              value={form.employees}
              onChange={(e) => setForm({ ...form, employees: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Annual revenue (£)</span>
            <input
              className="field"
              type="number"
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: Number(e.target.value) })}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Description</span>
            <textarea
              className="field min-h-[80px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
