"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Gauge,
  Plug,
  Rocket,
  ShieldAlert,
  Terminal,
  Wrench,
  XCircle,
  Repeat,
  Play,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { AgentConsole } from "@/components/agent/AgentConsole";
import { ToolCatalog } from "@/components/agent/ToolCatalog";
import { AutomationsPanel } from "@/components/agent/AutomationsPanel";
import { ProvidersPanel } from "@/components/agent/ProvidersPanel";
import { ControlApiPanel } from "@/components/agent/ControlApiPanel";
import { AuditPanel } from "@/components/agent/AuditPanel";
import { DeploymentPanel } from "@/components/agent/DeploymentPanel";
import { RiskBadge } from "@/components/agent/widgets";
import {
  useAgentRun,
  useAutomationScheduler,
  useRemoteQueue,
} from "@/components/agent/useAgentRun";
import { useAgentStore } from "@/lib/agent/agentStore";
import { TOOLS } from "@/lib/agent/registry";
import { PROVIDERS } from "@/lib/agent/providers";
import { cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";

type TabId = "operate" | "tools" | "automations" | "providers" | "api" | "audit" | "deploy";

const TABS: Array<{ id: TabId; label: string; icon: typeof Bot }> = [
  { id: "operate", label: "Operate", icon: Bot },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "automations", label: "Automations", icon: Repeat },
  { id: "providers", label: "Providers", icon: Cpu },
  { id: "api", label: "Control API", icon: Terminal },
  { id: "audit", label: "Runs & audit", icon: ClipboardList },
  { id: "deploy", label: "Deployment", icon: Rocket },
];

export default function BillAgentPage() {
  const [tab, setTab] = React.useState<TabId>("operate");
  const runner = useAgentRun();
  const remoteEnabled = useAgentStore((state) => state.remote.enabled);
  const remote = useRemoteQueue(remoteEnabled, runner.runToolDirect);
  const fired = useAutomationScheduler(runner.runToolDirect);
  const activeProviderId = useAgentStore((state) => state.activeProviderId);
  const providers = useAgentStore((state) => state.providers);
  const messages = useAgentStore((state) => state.messages);
  const toast = useToast();
  const announced = React.useRef(false);

  React.useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((item) => item.id === hash)) setTab(hash);
  }, []);

  const selectTab = (next: TabId) => {
    setTab(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${next}`);
    }
  };

  React.useEffect(() => {
    if (announced.current || fired.length === 0) return;
    announced.current = true;
    toast.success(
      `${fired.length} automation(s) ran on open`,
      fired.join(" · "),
    );
  }, [fired, toast]);

  const provider = PROVIDERS.find((item) => item.id === activeProviderId);
  const model =
    activeProviderId === "offline" ? "offline grammar" : providers[activeProviderId]?.model || "no model set";
  const approval = runner.approval;

  return (
    <div>
      <PageHeader
        eyebrow="Operator"
        title="Bill Agent"
        description="One AI operator for the whole workspace: every module exposed as a validated tool, an open-source-first provider layer, a bounded run loop, an audit trail, and an HTTP control surface. It works with no model at all — and gets sharper the moment you connect one."
        actions={
          <>
            <span className="chip">
              {provider?.name ?? "Offline"} · {model}
            </span>
            <span className="chip">{TOOLS.length} tools</span>
            <a
              href="/api/agent/manifest"
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-sm"
            >
              Manifest <ArrowUpRight className="size-3" />
            </a>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => selectTab("operate")}
                className="btn btn-sm btn-primary"
              >
                <Play className="size-3.5" /> Resume
              </button>
            )}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                active
                  ? "bg-[var(--color-brand-500)] text-white shadow-[0_6px_16px_-8px_rgba(249,115,22,.9)]"
                  : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "operate" && (
        <AgentConsole runner={runner} onOpenProviders={() => selectTab("providers")} />
      )}
      {tab === "tools" && <ToolCatalog runTool={runner.runToolDirect} />}
      {tab === "automations" && <AutomationsPanel runTool={runner.runToolDirect} />}
      {tab === "providers" && <ProvidersPanel />}
      {tab === "api" && <ControlApiPanel remote={remote} />}
      {tab === "audit" && <AuditPanel />}
      {tab === "deploy" && <DeploymentPanel />}

      <Modal
        open={Boolean(approval)}
        onClose={() => runner.resolveApproval(false)}
        title="Approve this tool call?"
        description={
          approval
            ? `${approval.tool.title} — ${approval.tool.risk} risk. Nothing has been written yet.`
            : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => runner.resolveApproval(false)}
              className="btn btn-ghost"
            >
              <XCircle className="size-3.5" /> Reject
            </button>
            <button
              type="button"
              onClick={() => runner.resolveApproval(true)}
              className={cn("btn", approval?.tool.risk === "destructive" ? "btn-danger" : "btn-primary")}
            >
              <CheckCircle2 className="size-3.5" /> Approve and run
            </button>
          </>
        }
      >
        {approval && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-[12.5px] font-bold">{approval.tool.name}</code>
              <RiskBadge risk={approval.tool.risk} />
              {approval.tool.risk === "destructive" && (
                <span className="chip border-[var(--color-signal-500)]/40 text-[var(--color-signal-500)]">
                  cannot be undone
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-[var(--fc-fg-muted)]">{approval.tool.description}</p>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--fc-fg-subtle)]">
                Arguments
              </span>
              <pre className="fc-scroll-thin mt-1 max-h-56 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5 font-mono text-[11px]">
{JSON.stringify(approval.call.args, null, 2)}
              </pre>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-[var(--fc-fg-subtle)]">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              Approving runs the tool against live workspace state and writes the call to the audit
              trail with these exact arguments.
            </p>
          </div>
        )}
      </Modal>

      <div className="mt-6 grid gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-4 text-[11.5px] text-[var(--fc-fg-muted)] sm:grid-cols-3">
        <p className="flex items-start gap-2">
          <Plug className="mt-0.5 size-3.5 shrink-0 text-[var(--color-brand-500)]" />
          <span>
            <strong className="block text-[var(--fc-fg)]">No provider lock-in</strong>
            Ollama, vLLM, llama.cpp, LocalAI, TGI, LM Studio, OpenRouter, Groq, Together, DeepSeek,
            Mistral, Fireworks, Cerebras, Novita, or any OpenAI-compatible gateway.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Gauge className="mt-0.5 size-3.5 shrink-0 text-[var(--color-accent-500)]" />
          <span>
            <strong className="block text-[var(--fc-fg)]">Bounded by construction</strong>
            Step budget, wall-clock budget, repetition guard and a goal check — four independent ways
            a run can stop.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#F59E0B]" />
          <span>
            <strong className="block text-[var(--fc-fg)]">Honest about limits</strong>
            The queue is server memory, the audit trail is this browser, and a local model needs CORS
            enabled. Each limit is written down where it applies.
          </span>
        </p>
      </div>
    </div>
  );
}
