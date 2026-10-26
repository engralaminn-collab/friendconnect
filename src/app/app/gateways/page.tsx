"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  FileJson,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Play,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  Terminal,
  Unplug,
  Webhook,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { GeneratedArt } from "@/components/studio/GeneratedArt";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile, relativeTime } from "@/lib/utils";
import { ipc } from "@/lib/ipc";
import type { GatewayConfig } from "@/lib/types";

const PROVIDER_ICON: Record<
  GatewayConfig["provider"],
  { icon: React.ElementType; color: string; label: string }
> = {
  httpsms: { icon: MessageSquare, color: "#14b8a6", label: "HTTP SMS" },
  domovina: { icon: Radio, color: "#3b64f6", label: "Domovina AI" },
  comfyui: { icon: ImageIcon, color: "#8b5cf6", label: "ComfyUI" },
  sip: { icon: Zap, color: "#f59e0b", label: "SIP" },
  webhook: { icon: Webhook, color: "#ec4899", label: "Webhook" },
};

export default function GatewaysPage() {
  const gateways = useStore((s) => s.gateways);
  const threads = useStore((s) => s.threads);
  const toggleGateway = useStore((s) => s.toggleGateway);
  const updateGateway = useStore((s) => s.updateGateway);
  const sendMessage = useStore((s) => s.sendMessage);
  const toast = useToast();

  const [activeId, setActiveId] = React.useState<string | null>(gateways[0]?.id ?? null);
  const [smsTo, setSmsTo] = React.useState("+44 7700 900112");
  const [smsBody, setSmsBody] = React.useState(
    "Your Chevenning timeline is confirmed — two documents outstanding.",
  );
  const [smsPreview, setSmsPreview] = React.useState<"curl" | "node" | "json">("curl");
  const [smsSent, setSmsSent] = React.useState(false);
  const [hookPayload, setHookPayload] = React.useState(
    `{
  "channel": "sms",
  "from": "+447700900555",
  "to": "+447700900000",
  "content": "Can I resend the checklist?",
  "receivedAt": "2026-10-26T09:14:22Z"
}`,
  );
  const [hookResult, setHookResult] = React.useState<{
    matched: string | null;
    body: string;
    accepted: boolean;
  } | null>(null);
  const [comfyPrompt, setComfyPrompt] = React.useState(
    "aurora gradient banner, indigo and teal, dark background, wide composition, no text",
  );
  const [comfyWorkflow, setComfyWorkflow] = React.useState("fc-brand-hero.json");
  const [comfyRunning, setComfyRunning] = React.useState(false);
  const [comfyProgress, setComfyProgress] = React.useState(0);
  const [comfyResult, setComfyResult] = React.useState<string | null>(null);
  const [ipcResults, setIpcResults] = React.useState<
    { channel: string; ok: boolean; output: string; ms: number }[]
  >([]);

  const active = gateways.find((g) => g.id === activeId) ?? null;

  const connectedCount = gateways.filter((g) => g.connected).length;
  const totalVolume = gateways.reduce((a, g) => a + g.monthlyVolume, 0);

  /* ---------------- SMS ---------------- */

  const smsGateway = gateways.find((g) => g.provider === "httpsms")!;

  const smsCurl = `curl -X POST ${smsGateway.baseUrl} \\
  -H "Content-Type: ${smsGateway.settings.contentType}" \\
  -H "${smsGateway.authHeader}: \$HTTP_SMS_API_KEY" \\
  -d '{
    "content": ${JSON.stringify(smsBody)},
    "from": "${smsGateway.settings.from}",
    "to": "${smsTo}"
  }'`;

  const smsNode = `import { HttpSMS } from "httpsms-node";

const client = new HttpSMS({
  apiKey: process.env.HTTP_SMS_API_KEY,
  baseUrl: "${smsGateway.baseUrl.replace("/v1/messages/send", "/v1")}",
});

await client.sendMessage({
  content: ${JSON.stringify(smsBody)},
  from: "${smsGateway.settings.from}",
  to: "${smsTo}",
});`;

  const smsJson = JSON.stringify(
    {
      content: smsBody,
      from: smsGateway.settings.from,
      to: smsTo,
    },
    null,
    2,
  );

  const sendSms = () => {
    if (!smsBody.trim()) {
      toast.warning("Empty message", "Type something to send.");
      return;
    }
    const thread = threads.find((t) => t.phone === smsTo);
    if (thread) sendMessage(thread.id, smsBody);
    setSmsSent(true);
    toast.success(
      "SMS queued",
      thread
        ? `Delivered to the ${thread.contactName} thread.`
        : `Queued to ${smsTo}.`,
    );
  };

  /* ---------------- inbound webhook ---------------- */

  const runWebhook = () => {
    try {
      const parsed = JSON.parse(hookPayload) as {
        channel?: string;
        from?: string;
        content?: string;
      };
      const thread = threads.find(
        (t) => t.phone === parsed.from || t.contactName === parsed.from,
      );
      if (thread && parsed.content) sendMessage(thread.id, parsed.content);
      setHookResult({
        matched: thread?.contactName ?? null,
        body: parsed.content ?? "",
        accepted: true,
      });
      toast.success(
        "Webhook accepted",
        thread
          ? `Routed into the ${thread.contactName} conversation.`
          : "No matching conversation — queued for triage.",
      );
    } catch {
      setHookResult({ matched: null, body: "", accepted: false });
      toast.error("Invalid payload", "The body is not valid JSON.");
    }
  };

  /* ---------------- ComfyUI ---------------- */

  const runComfy = () => {
    if (!comfyPrompt.trim()) {
      toast.warning("Empty prompt", "Describe the image first.");
      return;
    }
    setComfyRunning(true);
    setComfyProgress(0);
    setComfyResult(null);
    const timer = window.setInterval(() => {
      setComfyProgress((p) => {
        if (p >= 100) {
          window.clearInterval(timer);
          setComfyRunning(false);
          const seed = `${comfyPrompt} ${comfyWorkflow}`;
          setComfyResult(seed);
          toast.success(
            "ComfyUI finished",
            "The rendered frame is ready to share.",
          );
          return 0;
        }
        return Math.min(100, p + 7 + Math.round(Math.random() * 11));
      });
    }, 130);
  };

  const shareToChat = () => {
    const thread = threads[0];
    if (!thread || !comfyResult) return;
    sendMessage(thread.id, "", {
      kind: "image",
      name: "comfyui-render.png",
      sizeLabel: "1.8 MB",
      mime: "image/png",
      seed: comfyResult,
      width: 1920,
      height: 1080,
      caption: comfyPrompt,
    });
    toast.success("Shared", `Sent to ${thread.contactName}.`);
  };

  /* ---------------- IPC console ---------------- */

  const runIpc = async (channel: string, payload?: unknown) => {
    const started = performance.now();
    try {
      const value = await ipc.invoke(channel, payload);
      setIpcResults((r) => [
        {
          channel,
          ok: true,
          output:
            typeof value === "string"
              ? value
              : JSON.stringify(value, null, 2).slice(0, 400),
          ms: Math.round(performance.now() - started),
        },
        ...r,
      ]);
    } catch (err) {
      setIpcResults((r) => [
        {
          channel,
          ok: false,
          output: err instanceof Error ? err.message : "Failed",
          ms: Math.round(performance.now() - started),
        },
        ...r,
      ]);
    }
  };

  const ipcStats = ipc.getStats();

  return (
    <div className="mx-auto max-[1600px]">
      <PageHeader
        eyebrow="Connectivity"
        title="Gateways & bridges"
        description="The plumbing behind private messaging: SMS over plain HTTP, an AI-ready SMS gateway, a ComfyUI render queue, SIP signalling and a promise-based IPC bridge."
        actions={
          <button
            onClick={() => {
              gateways.forEach((g) => {
                if (!g.connected) toggleGateway(g.id);
              });
              toast.success("All gateways connected", "Five providers online.");
            }}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className="size-3.5" />
            Connect all
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gateways"
          value={gateways.length}
          deltaLabel={`${connectedCount} connected`}
          icon={<Link2 className="size-4" />}
        />
        <StatCard
          label="Messages / month"
          value={totalVolume.toLocaleString()}
          deltaLabel="across every provider"
          icon={<Send className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Render queue"
          value="4"
          deltaLabel="ComfyUI workflows ready"
          icon={<ImageIcon className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="IPC channels"
          value={ipcStats.length || 9}
          deltaLabel="promise-based request/response"
          icon={<Terminal className="size-4" />}
          tone="success"
        />
      </div>

      {/* ---------------- Gateway list ---------------- */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {gateways.map((g) => {
          const meta = PROVIDER_ICON[g.provider];
          const Icon = meta.icon;
          return (
            <button
              key={g.id}
              onClick={() => setActiveId(g.id)}
              className={cn(
                "fc-card fc-card-hover p-4 text-left",
                activeId === g.id && "border-[var(--color-brand-500)]",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{g.name}</div>
                  <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    {meta.label}
                  </div>
                </div>
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    g.connected ? "bg-emerald-500" : "bg-[var(--fc-fg-subtle)]",
                  )}
                />
              </div>
              <p className="mt-2.5 line-clamp-3 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                {g.description}
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-[var(--fc-line)] pt-2 text-[10.5px] text-[var(--fc-fg-subtle)]">
                <span>{g.monthlyVolume.toLocaleString()}/mo</span>
                <span>{g.lastSync ? relativeTime(g.lastSync) : "never"}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* ---------------- SMS console ---------------- */}
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
              <span
                className="grid size-9 place-items-center rounded-lg text-white"
                style={{ backgroundColor: PROVIDER_ICON.httpsms.color }}
              >
                <MessageSquare className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">
                  Send an SMS over plain HTTP
                </h2>
                <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  {smsGateway.baseUrl} · header {smsGateway.authHeader}
                </p>
              </div>
              <Badge tone={smsGateway.connected ? "success" : "danger"} dot>
                {smsGateway.connected ? "connected" : "offline"}
              </Badge>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold">To</span>
                  <input
                    className="field font-mono text-[12.5px]"
                    value={smsTo}
                    onChange={(e) => setSmsTo(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold">Message</span>
                  <textarea
                    className="field min-h-[110px] resize-y"
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={sendSms} className="btn btn-primary btn-sm">
                    <Send className="size-3.5" />
                    Send
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await copyToClipboard(smsCurl);
                      toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <Copy className="size-3.5" />
                    Copy request
                  </button>
                </div>
                {smsSent && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-400">
                    Accepted by the gateway. The message appears in the matching
                    conversation.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex gap-1">
                  {(
                    [
                      { id: "curl", l: "cURL" },
                      { id: "node", l: "Node SDK" },
                      { id: "json", l: "JSON body" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSmsPreview(t.id)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                        smsPreview === t.id
                          ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                          : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                      )}
                    >
                      {t.l}
                    </button>
                  ))}
                </div>
                <pre className="fc-scroll-thin max-h-72 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[#0d1024] p-4 font-mono text-[11px] leading-relaxed text-emerald-300">
                  {smsPreview === "curl"
                    ? smsCurl
                    : smsPreview === "node"
                    ? smsNode
                    : smsJson}
                </pre>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--fc-fg-subtle)]">
                  The Node SDK wraps the same three fields. No language gaps — the
                  payload is plain JSON with one API key in a header.
                </p>
              </div>
            </div>
          </div>

          {/* ---------------- Inbound webhook ---------------- */}
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
              <span
                className="grid size-9 place-items-center rounded-lg text-white"
                style={{ backgroundColor: PROVIDER_ICON.webhook.color }}
              >
                <Webhook className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">Inbound webhook</h2>
                <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  Paste the payload a provider would POST and watch it route.
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div>
                <textarea
                  className="field min-h-[200px] resize-y font-mono text-[11.5px] leading-relaxed"
                  value={hookPayload}
                  onChange={(e) => setHookPayload(e.target.value)}
                />
                <button onClick={runWebhook} className="btn btn-primary btn-sm mt-3">
                  <Play className="size-3.5" />
                  Deliver webhook
                </button>
              </div>
              <div>
                {hookResult ? (
                  <div
                    className={cn(
                      "rounded-xl border p-4",
                      hookResult.accepted
                        ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                        : "border-rose-500/30 bg-rose-500/[0.06]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {hookResult.accepted ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Unplug className="size-4 text-rose-500" />
                      )}
                      <span className="text-[13px] font-semibold">
                        {hookResult.accepted
                          ? "Accepted and routed"
                          : "Rejected — invalid body"}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-[12px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--fc-fg-muted)]">Conversation</dt>
                        <dd className="font-semibold">
                          {hookResult.matched ?? "no match — queued"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--fc-fg-muted)]">Signature</dt>
                        <dd className="font-semibold">verified</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--fc-fg-muted)]">Retries</dt>
                        <dd className="font-semibold">0</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--fc-line)] px-4 py-16 text-center text-[13px] text-[var(--fc-fg-muted)]">
                    Deliver the webhook to see the routing decision.
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                  <h3 className="mb-2 text-[12.5px] font-semibold">
                    Routing rules
                  </h3>
                  <ul className="space-y-2 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {[
                      "Match the sender number to a known contact, then to a thread.",
                      "If the sender is unknown, hold the message for triage instead of dropping it.",
                      "Verify the signature before parsing — a bad signature never reaches a parser.",
                      "Retry on a non-2xx with exponential backoff, and keep a dead letter queue.",
                    ].map((r) => (
                      <li key={r} className="flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- ComfyUI ---------------- */}
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
              <span
                className="grid size-9 place-items-center rounded-lg text-white"
                style={{ backgroundColor: PROVIDER_ICON.comfyui.color }}
              >
                <ImageIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">ComfyUI render queue</h2>
                <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  Queue a workflow, poll history, fetch the frame, share it into a
                  conversation.
                </p>
              </div>
              <Badge tone="success" dot>
                connected
              </Badge>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold">
                    Workflow
                  </span>
                  <select
                    className="field"
                    value={comfyWorkflow}
                    onChange={(e) => setComfyWorkflow(e.target.value)}
                  >
                    {[
                      "fc-brand-hero.json",
                      "fc-social-square.json",
                      "fc-photo-portrait.json",
                      "fc-text-to-image.json",
                    ].map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold">Prompt</span>
                  <textarea
                    className="field min-h-[110px] resize-y"
                    value={comfyPrompt}
                    onChange={(e) => setComfyPrompt(e.target.value)}
                  />
                </label>
                <button
                  onClick={runComfy}
                  disabled={comfyRunning}
                  className="btn btn-primary btn-sm"
                >
                  {comfyRunning ? (
                    <>
                      <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Queued
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" />
                      Queue prompt
                    </>
                  )}
                </button>
                {comfyRunning && (
                  <div>
                    <Progress value={comfyProgress} />
                    <p className="mt-1.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                      prompt_id queued · {comfyProgress}% · sampling
                    </p>
                  </div>
                )}
                {comfyResult && (
                  <button onClick={shareToChat} className="btn btn-secondary btn-sm">
                    <Send className="size-3.5" />
                    Share into chat
                  </button>
                )}
              </div>

              <div>
                {comfyResult ? (
                  <GeneratedArt
                    seed={comfyResult}
                    className="aspect-video w-full"
                    label={comfyPrompt}
                  />
                ) : (
                  <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-[var(--fc-line)] text-[13px] text-[var(--fc-fg-muted)]">
                    The rendered frame appears here.
                  </div>
                )}
                <pre className="fc-scroll-thin mt-3 max-h-40 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[#0d1024] p-3 font-mono text-[10.5px] leading-relaxed text-emerald-300">
{`POST ${"http://127.0.0.1:8188"}/prompt
{
  "prompt": "${comfyWorkflow}",
  "client_id": "friendconnect",
  "extra_data": { "prompt": ${JSON.stringify(comfyPrompt)} }
}

→ { "prompt_id": "9f2c…", "number": 412, "node_errors": {} }
GET /history/9f2c… → { "outputs": { "9": { "images": [{ "filename": "x.png" }] } } }`}
                </pre>
              </div>
            </div>
          </div>

          {/* ---------------- IPC bridge ---------------- */}
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
              <span
                className="grid size-9 place-items-center rounded-lg text-white"
                style={{ backgroundColor: "#64748b" }}
              >
                <Terminal className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">Promise IPC bridge</h2>
                <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  The renderer awaits a promise. The transport is the only thing that
                  changes when this moves into Electron.
                </p>
              </div>
              <Badge tone="accent">{ipcStats.length} channels</Badge>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-[12px] font-semibold">Invoke a channel</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "app:info",
                    "app:window.maximise",
                    "dialog:openFile",
                    "clipboard:write",
                    "notification:show",
                    "media:enumerate",
                    "storage:usage",
                    "shell:openExternal",
                    "payload:encrypt",
                  ].map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        void runIpc(
                          c,
                          c === "clipboard:write"
                            ? { text: "FriendConnect" }
                            : c === "notification:show"
                            ? { title: "Hello", body: "From the bridge" }
                            : c === "shell:openExternal"
                            ? { url: "https://friendconnect.app" }
                            : c === "payload:encrypt"
                            ? { text: "secret payload" }
                            : undefined,
                        )
                      }
                      className="chip hover:border-[var(--color-brand-400)]"
                    >
                      <Code2 className="size-2.5" />
                      {c}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-1.5">
                  {ipcResults.slice(0, 4).map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        {r.ok ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Unplug className="size-3.5 text-rose-500" />
                        )}
                        <span className="font-mono text-[11.5px] font-semibold">
                          {r.channel}
                        </span>
                        <span className="ml-auto text-[11px] tabular-nums text-[var(--fc-fg-subtle)]">
                          {r.ms}ms
                        </span>
                      </div>
                      <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] text-[var(--fc-fg-muted)]">
                        {r.output}
                      </pre>
                    </div>
                  ))}
                  {ipcResults.length === 0 && (
                    <p className="rounded-lg border border-dashed border-[var(--fc-line)] px-3 py-6 text-center text-[12px] text-[var(--fc-fg-muted)]">
                      Invoke a channel to see the round trip.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[12px] font-semibold">Channel monitor</h3>
                <div className="overflow-hidden rounded-lg border border-[var(--fc-line)]">
                  <table className="w-full text-left text-[11.5px]">
                    <thead className="bg-[var(--fc-surface-2)] text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Channel</th>
                        <th className="px-3 py-2 text-right font-semibold">Calls</th>
                        <th className="px-3 py-2 text-right font-semibold">Avg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fc-line)]">
                      {ipcStats.map((s) => (
                        <tr key={s.channel}>
                          <td className="px-3 py-2 font-mono">{s.channel}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {s.calls}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {s.avgLatencyMs}ms
                          </td>
                        </tr>
                      ))}
                      {ipcStats.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-[var(--fc-fg-muted)]"
                          >
                            No traffic yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--fc-fg-subtle)]">
                  Every request carries an id, so replies match, time out and
                  report. Swap the in-page transport for{" "}
                  <code className="font-mono">ipcRenderer.invoke</code> and nothing
                  above this line changes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- Side rail ---------------- */}
        <aside className="space-y-4">
          {active && (
            <div className="fc-card p-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-9 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: PROVIDER_ICON[active.provider].color }}
                >
                  {React.createElement(PROVIDER_ICON[active.provider].icon, {
                    className: "size-4",
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-semibold">{active.name}</h2>
                  <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    {PROVIDER_ICON[active.provider].label}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                {active.description}
              </p>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[12px] font-semibold">Base URL</span>
                <input
                  className="field font-mono text-[11.5px]"
                  value={active.baseUrl}
                  onChange={(e) =>
                    updateGateway(active.id, { baseUrl: e.target.value })
                  }
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12px] font-semibold">
                  Auth header
                </span>
                <input
                  className="field font-mono text-[11.5px]"
                  value={active.authHeader}
                  onChange={(e) =>
                    updateGateway(active.id, { authHeader: e.target.value })
                  }
                />
              </label>

              <div className="mt-4">
                <span className="mb-1.5 block text-[12px] font-semibold">Settings</span>
                <div className="space-y-2">
                  {Object.entries(active.settings).map(([k, v]) => (
                    <label key={k} className="block">
                      <span className="mb-1 block text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                        {k}
                      </span>
                      <input
                        className="field h-8 py-0 font-mono text-[11.5px]"
                        value={v}
                        onChange={(e) =>
                          updateGateway(active.id, {
                            settings: { ...active.settings, [k]: e.target.value },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-1.5 block text-[12px] font-semibold">Capabilities</span>
                <div className="flex flex-wrap gap-1.5">
                  {active.capabilities.map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    toggleGateway(active.id);
                    toast.success(
                      active.connected ? "Disconnected" : "Connected",
                      active.name,
                    );
                  }}
                  className={cn(
                    "btn btn-sm flex-1",
                    active.connected ? "btn-ghost" : "btn-primary",
                  )}
                >
                  {active.connected ? (
                    <>
                      <Unplug className="size-3.5" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Zap className="size-3.5" />
                      Connect
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard(
                      JSON.stringify(
                        {
                          url: active.baseUrl,
                          method: "POST",
                          headers: { [active.authHeader]: "<your-key>" },
                          body: { content: smsBody, from: active.settings.from, to: smsTo },
                        },
                        null,
                        2,
                      ),
                    );
                    toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <FileJson className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Settings2 className="size-4 text-[var(--color-brand-500)]" />
              Provider notes
            </h2>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {[
                "HTTP SMS takes one API key in a header and a three-field JSON body — that is why it ports to any language in an afternoon.",
                "The Node SDK adds typed helpers and a webhook client. It does not change the wire format.",
                "Domovina AI is built for agents: every inbound message can be handed straight to an agent loop instead of a human inbox.",
                "ComfyUI exposes a prompt queue over HTTP — post a workflow, poll history, fetch the frame.",
                "SIP needs a registrar, a transport and a codec list. The browser side handles the media; the gateway handles the signalling.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Traffic</h2>
            <div className="mt-3 space-y-2.5">
              {gateways.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--fc-fg-muted)]">{g.name}</span>
                    <span className="font-semibold tabular-nums">
                      {g.monthlyVolume.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (g.monthlyVolume / 9000) * 100)}%`,
                        backgroundColor: PROVIDER_ICON[g.provider].color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                downloadFile(
                  "gateway-config.json",
                  JSON.stringify(gateways, null, 2),
                );
                toast.success("Exported", "Gateway configuration");
              }}
              className="btn btn-secondary btn-sm mt-4 w-full"
            >
              <ArrowRight className="size-3.5" />
              Export configuration
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
