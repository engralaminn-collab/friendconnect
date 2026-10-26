/**
 * Promise-based IPC bridge.
 *
 * The pattern from `electron-promise-ipc`: the renderer never touches the
 * Electron API directly. It sends a message and awaits a promise that resolves
 * with the handler's return value. Every request carries an id, so replies can
 * be matched, timed out and surfaced in a live channel monitor.
 *
 * In the browser there is no main process, so the bridge ships with an
 * in-page implementation of the same handlers — the API surface is identical,
 * so moving to Electron later is a swap of the transport, not a rewrite.
 */

export type IpcResult<T = unknown> = {
  ok: boolean;
  value?: T;
  error?: string;
};

export interface IpcRequest {
  id: string;
  channel: string;
  payload?: unknown;
  timeoutMs?: number;
}

export interface IpcResponse {
  id: string;
  ok: boolean;
  value?: unknown;
  error?: string;
}

export type IpcHandler = (payload: unknown) => unknown | Promise<unknown>;

export interface ChannelStat {
  channel: string;
  calls: number;
  errors: number;
  lastLatencyMs: number;
  lastError?: string;
  avgLatencyMs: number;
}

let counter = 0;
const nextId = () => `ipc_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export class IpcBridge {
  private handlers = new Map<string, IpcHandler>();
  private listeners = new Map<string, Set<(payload: unknown) => void>>();
  private pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: number; channel: string }
  >();
  private stats = new Map<string, ChannelStat>();
  private subscribers = new Set<() => void>();

  constructor(private defaultTimeoutMs = 8000) {}

  /* ---------------- registration ---------------- */

  handle(channel: string, handler: IpcHandler) {
    this.handlers.set(channel, handler);
    this.ensureStat(channel);
    return () => this.handlers.delete(channel);
  }

  on(channel: string, fn: (payload: unknown) => void) {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(fn);
    this.ensureStat(channel);
    return () => this.listeners.get(channel)?.delete(fn);
  }

  /** Fire an event to every subscriber. Returns the number reached. */
  emit(channel: string, payload?: unknown) {
    const subs = this.listeners.get(channel);
    const stat = this.ensureStat(channel);
    stat.calls += 1;
    if (!subs || subs.size === 0) return 0;
    subs.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        stat.errors += 1;
      }
    });
    return subs.size;
  }

  /* ---------------- invocation ---------------- */

  invoke<T = unknown>(channel: string, payload?: unknown, timeoutMs?: number): Promise<T> {
    const handler = this.handlers.get(channel);
    const stat = this.ensureStat(channel);
    stat.calls += 1;
    const started = performance.now();

    if (!handler) {
      stat.errors += 1;
      stat.lastError = "No handler registered";
      return Promise.reject(new Error(`No IPC handler registered for "${channel}"`));
    }

    return new Promise<T>((resolve, reject) => {
      const id = nextId();
      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        stat.errors += 1;
        stat.lastError = "Timeout";
        reject(new Error(`IPC "${channel}" timed out`));
      }, timeoutMs ?? this.defaultTimeoutMs);

      this.pending.set(id, {
        resolve: (v) => {
          window.clearTimeout(timeout);
          const ms = Math.round(performance.now() - started);
          stat.lastLatencyMs = ms;
          stat.avgLatencyMs = Math.round(
            (stat.avgLatencyMs * (stat.calls - 1) + ms) / stat.calls,
          );
          resolve(v as T);
        },
        reject: (e) => {
          window.clearTimeout(timeout);
          stat.errors += 1;
          stat.lastError = e.message;
          reject(e);
        },
        timer: timeout,
        channel,
      });

      // Deliver through the transport. In a real desktop build this is
      // `ipcRenderer.invoke`; here it is an in-page message hop.
      void this.dispatch(id, channel, payload, handler);
    });
  }

  private async dispatch(
    id: string,
    channel: string,
    payload: unknown,
    handler: IpcHandler,
  ) {
    try {
      const value = await handler(payload);
      this.settle({ id, ok: true, value });
    } catch (err) {
      this.settle({
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    void channel;
  }

  /** Inject a response — the seam a real transport would use. */
  settle(response: IpcResponse) {
    const p = this.pending.get(response.id);
    if (!p) return;
    this.pending.delete(response.id);
    if (response.ok) p.resolve(response.value);
    else p.reject(new Error(response.error ?? "IPC failed"));
    this.notify();
  }

  private ensureStat(channel: string) {
    let s = this.stats.get(channel);
    if (!s) {
      s = {
        channel,
        calls: 0,
        errors: 0,
        lastLatencyMs: 0,
        avgLatencyMs: 0,
      };
      this.stats.set(channel, s);
    }
    return s;
  }

  getStats(): ChannelStat[] {
    return Array.from(this.stats.values()).sort((a, b) => b.calls - a.calls);
  }

  subscribe(fn: () => void) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private notify() {
    this.subscribers.forEach((f) => f());
  }
}

/* ------------------------------------------------------------------ */
/* The in-page "main process"                                           */
/* ------------------------------------------------------------------ */

export const ipc = new IpcBridge();

/** Registers the handlers that a desktop shell would expose. */
export function registerDesktopHandlers(bridge: IpcBridge = ipc) {
  bridge.handle("app:info", () => ({
    name: "FriendConnect",
    version: "1.0.0",
    platform: "web",
    runtime: "Next.js 15 · React 19",
  }));

  bridge.handle("app:window.minimise", () => ({ ok: true, action: "minimise" }));
  bridge.handle("app:window.maximise", () => ({ ok: true, action: "maximise" }));
  bridge.handle("app:window.close", () => ({ ok: true, action: "close" }));

  bridge.handle("dialog:openFile", (payload) => {
    const p = payload as { accept?: string; multiple?: boolean } | undefined;
    return {
      cancelled: false,
      files: [
        {
          name: "student-passport-scan.pdf",
          size: 1_842_112,
          type: p?.accept ?? "application/pdf",
        },
      ],
    };
  });

  bridge.handle("clipboard:write", (payload) => {
    const text = String((payload as { text?: string })?.text ?? "");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(() => {});
    }
    return { ok: true, length: text.length };
  });

  bridge.handle("notification:show", (payload) => {
    const p = payload as { title?: string; body?: string } | undefined;
    let shown = false;
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") {
        new Notification(p?.title ?? "FriendConnect", { body: p?.body ?? "" });
        shown = true;
      } else if (Notification.permission === "default") {
        void Notification.requestPermission().catch(() => {});
      }
    }
    return { shown, title: p?.title ?? "" };
  });

  bridge.handle("media:enumerate", async () => {
    try {
      const list = await navigator.mediaDevices?.enumerateDevices?.();
      return (list ?? []).map((d) => ({
        deviceId: d.deviceId,
        kind: d.kind,
        label: d.label || `${d.kind} (permission required)`,
      }));
    } catch {
      return [];
    }
  });

  bridge.handle("storage:usage", async () => {
    if (!navigator.storage?.estimate) return { used: 0, quota: 0 };
    const est = await navigator.storage.estimate();
    return { used: est.usage ?? 0, quota: est.quota ?? 0 };
  });

  bridge.handle("shell:openExternal", (payload) => {
    const url = String((payload as { url?: string })?.url ?? "");
    return { ok: true, url, blocked: !url.startsWith("https://") };
  });

  bridge.handle("payload:encrypt", (payload) => {
    const text = String((payload as { text?: string })?.text ?? "");
    // A reversible stand-in for a real encrypt/decrypt round trip — the point
    // is that the payload crosses the boundary and comes back intact.
    const bytes = Array.from(text)
      .map((c) => c.charCodeAt(0).toString(16).padStart(4, "0"))
      .join("");
    return { cipher: `fc1:${bytes}`, length: text.length };
  });

  return bridge;
}

if (typeof window !== "undefined") {
  registerDesktopHandlers(ipc);
}
