"use client";

import * as React from "react";
import {
  AlertTriangle,
  Anchor,
  Boxes,
  CheckCircle2,
  Clock,
  FileWarning,
  MapPin,
  Package,
  Route,
  Ship,
  Truck,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { BarChart, DonutChart } from "@/components/charts";
import { useToast } from "@/store/useUI";
import { cn, formatDate, relativeTime } from "@/lib/utils";

type ShipmentStatus =
  | "pending"
  | "picking"
  | "in-transit"
  | "customs"
  | "delivered"
  | "exception";

interface Shipment {
  id: string;
  ref: string;
  carrier: string;
  mode: "air" | "sea" | "road" | "rail";
  origin: string;
  destination: string;
  status: ShipmentStatus;
  progress: number;
  etd: string;
  eta: string;
  weightKg: number;
  pieces: number;
  customs: "cleared" | "pending" | "held" | "not-required";
  incoterm: string;
  value: number;
  customer: string;
  lastEvent: string;
}

const STATUS_META: Record<
  ShipmentStatus,
  { label: string; tone: "neutral" | "brand" | "accent" | "signal" | "danger" | "success"; icon: React.ElementType }
> = {
  pending: { label: "Pending", tone: "neutral", icon: Clock },
  picking: { label: "Picking", tone: "brand", icon: Boxes },
  "in-transit": { label: "In transit", tone: "accent", icon: Ship },
  customs: { label: "Customs", tone: "signal", icon: FileWarning },
  delivered: { label: "Delivered", tone: "success", icon: CheckCircle2 },
  exception: { label: "Exception", tone: "danger", icon: AlertTriangle },
};

const SEED: Shipment[] = [
  {
    id: "sh_1",
    ref: "FC-4821",
    carrier: "Maersk",
    mode: "sea",
    origin: "Shenzhen, CN",
    destination: "Felixstowe, UK",
    status: "in-transit",
    progress: 62,
    etd: "2026-09-28",
    eta: "2026-10-31",
    weightKg: 18400,
    pieces: 940,
    customs: "pending",
    incoterm: "DDP",
    value: 214_500,
    customer: "Northwind Retail",
    lastEvent: "Departed Singapore transhipment 14 hours ago",
  },
  {
    id: "sh_2",
    ref: "FC-4822",
    carrier: "DHL Express",
    mode: "air",
    origin: "Frankfurt, DE",
    destination: "Manchester, UK",
    status: "customs",
    progress: 78,
    etd: "2026-10-20",
    eta: "2026-10-27",
    weightKg: 220,
    pieces: 12,
    customs: "held",
    incoterm: "DAP",
    value: 48_900,
    customer: "Arden Labs",
    lastEvent: "Held: missing commercial invoice line items",
  },
  {
    id: "sh_3",
    ref: "FC-4823",
    carrier: "DB Schenker",
    mode: "road",
    origin: "Rotterdam, NL",
    destination: "Birmingham, UK",
    status: "in-transit",
    progress: 44,
    etd: "2026-10-24",
    eta: "2026-10-26",
    weightKg: 6120,
    pieces: 260,
    customs: "not-required",
    incoterm: "FCA",
    value: 96_400,
    customer: "Hollowbrook Ltd",
    lastEvent: "Crossed Dover, ETA unchanged",
  },
  {
    id: "sh_4",
    ref: "FC-4824",
    carrier: "Kuehne+Nagel",
    mode: "air",
    origin: "Shanghai, CN",
    destination: "London Heathrow, UK",
    status: "delivered",
    progress: 100,
    etd: "2026-10-08",
    eta: "2026-10-15",
    weightKg: 840,
    pieces: 38,
    customs: "cleared",
    incoterm: "DDP",
    value: 132_000,
    customer: "Meridian Home",
    lastEvent: "Delivered and signed for 12 days ago",
  },
  {
    id: "sh_5",
    ref: "FC-4825",
    carrier: "FedEx Freight",
    mode: "road",
    origin: "Bristol, UK",
    destination: "Cardiff, UK",
    status: "exception",
    progress: 31,
    etd: "2026-10-25",
    eta: "2026-10-27",
    weightKg: 940,
    pieces: 44,
    customs: "not-required",
    incoterm: "EXW",
    value: 18_700,
    customer: "Kestrel Studio",
    lastEvent: "Exception: two pallets refused on pallet exchange",
  },
  {
    id: "sh_6",
    ref: "FC-4826",
    carrier: "CMA CGM",
    mode: "sea",
    origin: "Yantian, CN",
    destination: "London Gateway, UK",
    status: "pending",
    progress: 8,
    etd: "2026-10-27",
    eta: "2026-11-24",
    weightKg: 22_400,
    pieces: 1180,
    customs: "not-required",
    incoterm: "FOB",
    value: 178_200,
    customer: "Northwind Retail",
    lastEvent: "Booking confirmed, awaiting container release",
  },
  {
    id: "sh_7",
    ref: "FC-4827",
    carrier: "Eurostar Freight",
    mode: "rail",
    origin: "Paris, FR",
    destination: "London, UK",
    status: "picking",
    progress: 18,
    etd: "2026-10-26",
    eta: "2026-10-28",
    weightKg: 3200,
    pieces: 120,
    customs: "not-required",
    incoterm: "DAP",
    value: 61_500,
    customer: "Arden Labs",
    lastEvent: "Picked at Lille consolidation hub",
  },
];

const STATUS_FILTERS: (ShipmentStatus | "all")[] = [
  "all",
  "pending",
  "picking",
  "in-transit",
  "customs",
  "delivered",
  "exception",
];

export default function LogisticsPage() {
  const toast = useToast();
  const [shipments, setShipments] = React.useState<Shipment[]>(SEED);
  const [status, setStatus] = React.useState<ShipmentStatus | "all">("all");
  const [mode, setMode] = React.useState<Shipment["mode"] | "all">("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(SEED[0].id);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = shipments.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (mode === "all" || s.mode === mode) &&
      (!query.trim() ||
        s.ref.toLowerCase().includes(query.toLowerCase()) ||
        s.customer.toLowerCase().includes(query.toLowerCase()) ||
        s.carrier.toLowerCase().includes(query.toLowerCase())),
  );

  const selected = shipments.find((s) => s.id === selectedId) ?? null;

  const inTransit = shipments.filter((s) => s.status === "in-transit");
  const onTime =
    shipments.filter((s) => s.status !== "exception").length /
    Math.max(1, shipments.length);
  const customsHeld = shipments.filter((s) => s.customs === "held").length;
  const totalValue = shipments.reduce((a, s) => a + s.value, 0);

  const statusData = (Object.keys(STATUS_META) as ShipmentStatus[]).map((k) => ({
    label: STATUS_META[k].label,
    value: shipments.filter((s) => s.status === k).length,
  }));

  const carrierData = Array.from(new Set(shipments.map((s) => s.carrier))).map((c) => ({
    label: c,
    value: shipments.filter((s) => s.carrier === c).length,
  }));

  const advance = (s: Shipment) => {
    const order: ShipmentStatus[] = [
      "pending",
      "picking",
      "in-transit",
      "customs",
      "delivered",
    ];
    const i = order.indexOf(s.status);
    if (s.status === "exception") {
      setShipments((all) =>
        all.map((x) =>
          x.id === s.id
            ? { ...x, status: "in-transit", lastEvent: "Exception resolved, back in transit" }
            : x,
        ),
      );
      toast.success("Exception cleared", s.ref);
      return;
    }
    const next = order[Math.min(order.length - 1, i + 1)];
    setShipments((all) =>
      all.map((x) =>
        x.id === s.id
          ? {
              ...x,
              status: next,
              progress: Math.min(100, x.progress + 18),
              lastEvent: `Status advanced to ${STATUS_META[next].label.toLowerCase()}`,
            }
          : x,
      ),
    );
    toast.info("Shipment advanced", `${s.ref} → ${STATUS_META[next].label}`);
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Operations"
        title="Logistics"
        description="Shipments, carriers and customs in one board — where freight actually is, what it is worth, and what is stuck at the border."
        actions={
          <button
            onClick={() =>
              toast.success(
                "Tracking refreshed",
                "12 carrier feeds polled — 3 status changes.",
              )
            }
            className="btn btn-secondary btn-sm"
          >
            <Route className="size-3.5" />
            Refresh tracking
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active shipments"
          value={shipments.filter((s) => s.status !== "delivered").length}
          deltaLabel={`${inTransit.length} in transit`}
          icon={<Ship className="size-4" />}
        />
        <StatCard
          label="On-time rate"
          value={`${(onTime * 100).toFixed(0)}%`}
          deltaLabel="excluding open exceptions"
          icon={<Clock className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Customs holds"
          value={customsHeld}
          deltaLabel="need documentation"
          icon={<FileWarning className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Cargo value"
          value={`£${(totalValue / 1_000_000).toFixed(2)}M`}
          deltaLabel="across every shipment"
          icon={<Package className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <input
              className="field min-w-[200px] flex-1"
              placeholder="Search by reference, carrier or customer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {STATUS_FILTERS.map((s) => (
              <FilterChip
                key={s}
                active={status === s}
                onClick={() => setStatus(status === s ? "all" : s)}
                count={
                  s === "all"
                    ? shipments.length
                    : shipments.filter((x) => x.status === s).length
                }
              >
                {s === "all" ? "All" : STATUS_META[s].label}
              </FilterChip>
            ))}
            <span className="mx-1 h-5 w-px bg-[var(--fc-line)]" />
            {(["all", "sea", "air", "road", "rail"] as const).map((m) => (
              <FilterChip
                key={m}
                active={mode === m}
                onClick={() => setMode(mode === m ? "all" : m)}
              >
                {m === "all" ? "Any mode" : m}
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Ship className="size-6" />}
              title="No shipments match"
              description="Adjust the filters."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const meta = STATUS_META[s.status];
                const Icon = meta.icon;
                return (
                  <article
                    key={s.id}
                    className={cn(
                      "fc-card fc-card-hover p-5",
                      selectedId === s.id && "border-[var(--color-brand-500)]",
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl",
                          s.status === "exception"
                            ? "bg-rose-500/12 text-rose-500"
                            : s.status === "delivered"
                            ? "bg-emerald-500/12 text-emerald-500"
                            : "bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]",
                        )}
                      >
                        <Icon className="size-4.5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedId(s.id);
                              setDetailOpen(true);
                            }}
                            className="font-mono text-[14px] font-bold"
                          >
                            {s.ref}
                          </button>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          <Badge>{s.mode}</Badge>
                          <Badge>{s.carrier}</Badge>
                          <Badge>{s.incoterm}</Badge>
                          {s.customs === "held" && (
                            <Badge tone="danger">
                              <FileWarning className="size-2.5" />
                              customs hold
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-[var(--fc-fg-muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {s.origin}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            →
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Anchor className="size-3.5" />
                            {s.destination}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Truck className="size-3.5" />
                            {s.weightKg.toLocaleString()} kg · {s.pieces} pcs
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="size-3.5" />
                            ETA {formatDate(s.eta)}
                          </span>
                        </div>

                        <p className="mt-2 text-[12px] text-[var(--fc-fg-subtle)]">
                          {s.lastEvent} · {s.customer}
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                          <span className="w-40">
                            <Progress
                              value={s.progress}
                              tone={
                                s.status === "exception"
                                  ? "danger"
                                  : s.status === "delivered"
                                  ? "success"
                                  : "brand"
                              }
                            />
                          </span>
                          <span className="text-[11.5px] tabular-nums text-[var(--fc-fg-muted)]">
                            {s.progress}%
                          </span>
                          <span className="ml-auto text-[12.5px] font-semibold tabular-nums">
                            £{s.value.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => advance(s)}
                        className="btn btn-secondary btn-sm shrink-0"
                      >
                        Advance
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
            <h2 className="text-[15px] font-semibold">Status mix</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Shipments"
                centerValue={String(shipments.length)}
                data={statusData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Carriers</h2>
            <div className="mt-4">
              <BarChart
                height={180}
                labels={carrierData.map((c) => c.label)}
                series={[{ name: "Shipments", data: carrierData.map((c) => c.value) }]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Customs checklist</h2>
            <ul className="mt-3 space-y-2">
              {[
                { l: "Commercial invoice matches PO value", ok: true },
                { l: "HS codes assigned for every line", ok: true },
                { l: "Certificates of origin attached", ok: false },
                { l: "Excise and duty prepaid where DDP", ok: false },
                { l: "Restricted-goods screening current", ok: true },
              ].map((c) => (
                <li
                  key={c.l}
                  className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]"
                >
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--color-signal-500)]" />
                  )}
                  {c.l}
                </li>
              ))}
            </ul>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Route health</h2>
            <ul className="mt-3 space-y-2">
              {[
                { l: "Shenzhen → Felixstowe", v: "On schedule", tone: "success" as const },
                { l: "Frankfurt → Manchester", v: "Held at customs", tone: "signal" as const },
                { l: "Rotterdam → Birmingham", v: "On schedule", tone: "success" as const },
                { l: "Bristol → Cardiff", v: "Pallet exception", tone: "danger" as const },
              ].map((r) => (
                <li
                  key={r.l}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <span className="min-w-0 truncate text-[12px]">{r.l}</span>
                  <Badge tone={r.tone}>{r.v}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selected ? `Shipment ${selected.ref}` : ""}
        description={selected ? `${selected.carrier} · ${selected.mode.toUpperCase()} · ${selected.incoterm}` : ""}
        size="lg"
        footer={
          <>
            <button onClick={() => setDetailOpen(false)} className="btn btn-ghost btn-sm">
              Close
            </button>
            {selected && (
              <button
                onClick={() => {
                  advance(selected);
                  setDetailOpen(false);
                }}
                className="btn btn-primary btn-sm"
              >
                Advance status
              </button>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { l: "Customer", v: selected.customer },
                { l: "Origin", v: selected.origin },
                { l: "Destination", v: selected.destination },
                { l: "Incoterm", v: selected.incoterm },
                { l: "ETD", v: formatDate(selected.etd) },
                { l: "ETA", v: formatDate(selected.eta) },
                { l: "Weight", v: `${selected.weightKg.toLocaleString()} kg` },
                { l: "Pieces", v: selected.pieces.toLocaleString() },
                { l: "Cargo value", v: `£${selected.value.toLocaleString()}` },
                { l: "Customs", v: selected.customs },
              ].map((row) => (
                <div
                  key={row.l}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    {row.l}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold capitalize">{row.v}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-[12.5px]">
                <span className="font-semibold">Journey progress</span>
                <span className="tabular-nums text-[var(--fc-fg-muted)]">
                  {selected.progress}% · last event {relativeTime(selected.etd)}
                </span>
              </div>
              <Progress
                value={selected.progress}
                tone={selected.status === "exception" ? "danger" : "brand"}
              />
            </div>

            <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
              <h3 className="text-[13px] font-semibold">Timeline</h3>
              <ol className="mt-3 space-y-2.5">
                {[
                  { l: "Booking confirmed", at: selected.etd, done: true },
                  { l: "Picked and packed", at: selected.etd, done: selected.progress > 20 },
                  {
                    l: "Departed origin gateway",
                    at: selected.etd,
                    done: selected.progress > 35,
                  },
                  {
                    l:
                      selected.customs === "held"
                        ? "Customs hold — awaiting documents"
                        : "Customs clearance",
                    at: selected.eta,
                    done: selected.customs === "cleared",
                  },
                  { l: "Delivered", at: selected.eta, done: selected.status === "delivered" },
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        t.done ? "bg-emerald-500" : "bg-[var(--fc-fg-subtle)]",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[12.5px]",
                        t.done
                          ? "font-medium"
                          : "text-[var(--fc-fg-subtle)]",
                      )}
                    >
                      {t.l}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
