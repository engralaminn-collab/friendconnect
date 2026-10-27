/* ============================================================
   Bill Agent — provider layer
   ------------------------------------------------------------
   Open-source first. Every entry below is either an open-weights
   runtime you host yourself (Ollama, vLLM, llama.cpp, LocalAI,
   TGI) or an aggregator whose catalogue is mostly open weights.
   All of them speak one of two wires:
     · openai — POST {base}/chat/completions + function calling
     · ollama — POST {base}/api/chat + tool_calls
   Nothing here proxies through a FriendConnect server: the browser
   talks straight to the endpoint you configure, so keys never leave
   the device and self-hosted models stay on your network.
   ============================================================ */

import type {
  ChatTurn,
  PendingToolCall,
  ProviderCatalogEntry,
  ProviderConfig,
} from "./types";

export interface ProviderPreset extends ProviderCatalogEntry {
  /** Shown in the UI under the name. */
  blurb: string;
}

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "ollama",
    name: "Ollama",
    blurb: "One binary, one command, the widest local model library. The default choice.",
    kind: "local",
    openSource: true,
    licence: "MIT",
    homepage: "https://ollama.com",
    docs: "https://github.com/ollama/ollama/blob/main/docs/api.md",
    defaultBaseUrl: "http://127.0.0.1:11434",
    requiresKey: false,
    wire: "ollama",
    suggestedModels: ["llama3.3", "qwen2.5:14b", "deepseek-r1:8b", "phi4", "gemma3:12b", "mistral-small3.1"],
    note: "Start it with OLLAMA_ORIGINS=* so the browser may call it from another origin.",
  },
  {
    id: "vllm",
    name: "vLLM",
    blurb: "The throughput king. OpenAI-compatible server with paged attention.",
    kind: "local",
    openSource: true,
    licence: "Apache-2.0",
    homepage: "https://github.com/vllm-project/vllm",
    docs: "https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html",
    defaultBaseUrl: "http://127.0.0.1:8000/v1",
    requiresKey: false,
    wire: "openai",
    suggestedModels: ["Qwen/Qwen2.5-14B-Instruct", "meta-llama/Llama-3.3-70B-Instruct", "mistralai/Mistral-Small-24B-Instruct-2501"],
  },
  {
    id: "llamacpp",
    name: "llama.cpp server",
    blurb: "One GGUF file, one port. The smallest possible footprint.",
    kind: "local",
    openSource: true,
    licence: "MIT",
    homepage: "https://github.com/ggml-org/llama.cpp",
    docs: "https://github.com/ggml-org/llama.cpp/tree/master/tools/server",
    defaultBaseUrl: "http://127.0.0.1:8080/v1",
    requiresKey: false,
    wire: "openai",
    suggestedModels: ["local-model"],
    note: "Run `llama-server -m model.gguf --host 0.0.0.0 --port 8080` and set --jinja for tool calling.",
  },
  {
    id: "localai",
    name: "LocalAI",
    blurb: "Drop-in OpenAI replacement for text, images and speech.",
    kind: "local",
    openSource: true,
    licence: "MIT",
    homepage: "https://localai.io",
    docs: "https://localai.io/basics/getting_started/",
    defaultBaseUrl: "http://127.0.0.1:8080/v1",
    requiresKey: false,
    wire: "openai",
    suggestedModels: ["gpt-4", "qwen2.5-14b-instruct"],
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    blurb: "Desktop GUI over llama.cpp. Good for a first local model.",
    kind: "local",
    openSource: false,
    licence: "Proprietary (free for personal use)",
    homepage: "https://lmstudio.ai",
    docs: "https://lmstudio.ai/docs/app/api",
    defaultBaseUrl: "http://127.0.0.1:1234/v1",
    requiresKey: false,
    wire: "openai",
    suggestedModels: ["local-model"],
    note: "Enable the local server and CORS in Developer settings.",
  },
  {
    id: "tgi",
    name: "Hugging Face TGI",
    blurb: "Text Generation Inference — the server behind most HF endpoints.",
    kind: "local",
    openSource: true,
    licence: "Apache-2.0",
    homepage: "https://github.com/huggingface/text-generation-inference",
    docs: "https://huggingface.co/docs/text-generation-inference",
    defaultBaseUrl: "http://127.0.0.1:8080/v1",
    requiresKey: false,
    wire: "openai",
    suggestedModels: ["tgi-model"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    blurb: "One key, hundreds of models — including every major open-weights family.",
    kind: "cloud",
    openSource: true,
    licence: "Aggregator (models vary)",
    homepage: "https://openrouter.ai",
    docs: "https://openrouter.ai/docs",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["meta-llama/llama-3.3-70b-instruct", "qwen/qwen-2.5-72b-instruct", "deepseek/deepseek-chat", "mistralai/mistral-small-3.2-24b-instruct"],
  },
  {
    id: "groq",
    name: "Groq",
    blurb: "LPU inference of open models. Very fast, very cheap.",
    kind: "cloud",
    openSource: true,
    licence: "Hosted open weights",
    homepage: "https://groq.com",
    docs: "https://console.groq.com/docs/openai",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["llama-3.3-70b-versatile", "qwen-2.5-32b", "deepseek-r1-distill-llama-70b"],
  },
  {
    id: "together",
    name: "Together AI",
    blurb: "Open-weight hosting with a large catalogue and fine-tuning.",
    kind: "cloud",
    openSource: true,
    licence: "Hosted open weights",
    homepage: "https://together.ai",
    docs: "https://docs.together.ai/docs/openai-api-compatibility",
    defaultBaseUrl: "https://api.together.xyz/v1",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "deepseek-ai/DeepSeek-V3"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    blurb: "Open weights, strong reasoning, OpenAI-compatible API.",
    kind: "cloud",
    openSource: true,
    licence: "MIT (weights)",
    homepage: "https://www.deepseek.com",
    docs: "https://api-docs.deepseek.com",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "mistral",
    name: "Mistral",
    blurb: "European lab, Apache-2.0 weights for the small and medium models.",
    kind: "cloud",
    openSource: true,
    licence: "Apache-2.0 (most models)",
    homepage: "https://mistral.ai",
    docs: "https://docs.mistral.ai/api",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["mistral-small-latest", "open-mistral-nemo", "mistral-large-latest"],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    blurb: "Fast open-model serving with function calling.",
    kind: "cloud",
    openSource: true,
    licence: "Hosted open weights",
    homepage: "https://fireworks.ai",
    docs: "https://docs.fireworks.ai/api-reference/introduction",
    defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/qwen2p5-72b-instruct"],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    blurb: "Wafer-scale inference. The fastest tokens per second we have tested.",
    kind: "cloud",
    openSource: true,
    licence: "Hosted open weights",
    homepage: "https://cerebras.ai",
    docs: "https://inference-docs.cerebras.ai",
    defaultBaseUrl: "https://api.cerebras.ai/v1",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["llama-3.3-70b", "qwen-3-32b"],
  },
  {
    id: "novita",
    name: "Novita AI",
    blurb: "Budget open-model hosting with an OpenAI-shaped API.",
    kind: "cloud",
    openSource: true,
    licence: "Hosted open weights",
    homepage: "https://novita.ai",
    docs: "https://novita.ai/docs/api-reference/introduction",
    defaultBaseUrl: "https://api.novita.ai/v3/openai",
    requiresKey: true,
    wire: "openai",
    suggestedModels: ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-v3"],
  },
  {
    id: "custom",
    name: "Custom OpenAI-compatible",
    blurb: "Any endpoint that speaks /chat/completions — including your own gateway.",
    kind: "custom",
    openSource: true,
    licence: "Your deployment",
    homepage: "",
    docs: "",
    defaultBaseUrl: "http://127.0.0.1:4000/v1",
    requiresKey: false,
    wire: "openai",
    suggestedModels: ["your-model"],
    note: "Use this for LiteLLM, one-api, new-api, unorouter or an internal proxy.",
  },
];

export const PROVIDER_IDS = PROVIDERS.map((p) => p.id);

export function getProvider(id: string): ProviderPreset | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Default per-provider configuration. */
export function defaultProviderConfig(id: string): ProviderConfig {
  const preset = getProvider(id);
  return {
    baseUrl: preset?.defaultBaseUrl ?? "",
    apiKey: "",
    model: preset?.suggestedModels[0] ?? "",
    enabled: false,
  };
}

/* ------------------------------------------------------------------ */
/* URL handling                                                        */
/* ------------------------------------------------------------------ */

export function normalizeBaseUrl(input: string): string {
  let url = (input ?? "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, "");
  // Tolerate operators pasting the full endpoint.
  url = url.replace(/\/(api\/chat|chat\/completions|completions)$/i, "");
  return url;
}

export function chatEndpoint(preset: ProviderPreset, baseUrl: string): string {
  const base = normalizeBaseUrl(baseUrl);
  if (preset.wire === "ollama") return `${base}/api/chat`;
  return `${base}/chat/completions`;
}

export function modelsEndpoint(preset: ProviderPreset, baseUrl: string): string {
  const base = normalizeBaseUrl(baseUrl);
  if (preset.wire === "ollama") return `${base}/api/tags`;
  return `${base}/models`;
}

/* ------------------------------------------------------------------ */
/* Request building                                                    */
/* ------------------------------------------------------------------ */

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export function toOpenAiMessages(turns: ChatTurn[]): OpenAiMessage[] {
  return turns.map((turn) => {
    if (turn.role === "assistant" && turn.toolCalls && turn.toolCalls.length > 0) {
      return {
        role: "assistant",
        content: turn.content ?? "",
        tool_calls: turn.toolCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
        })),
      };
    }
    if (turn.role === "tool") {
      return {
        role: "tool",
        content: turn.content,
        tool_call_id: turn.toolCallId ?? "",
        name: turn.name,
      };
    }
    return { role: turn.role, content: turn.content };
  });
}

export function buildRequestBody(
  preset: ProviderPreset,
  model: string,
  turns: ChatTurn[],
  tools: unknown[],
  temperature = 0.2,
): Record<string, unknown> {
  if (preset.wire === "ollama") {
    return {
      model,
      messages: turns.map((turn) => {
        if (turn.role === "assistant" && turn.toolCalls) {
          return {
            role: "assistant",
            content: turn.content ?? "",
            tool_calls: turn.toolCalls.map((call) => ({
              function: { name: call.name, arguments: call.args ?? {} },
            })),
          };
        }
        return { role: turn.role, content: turn.content };
      }),
      tools,
      stream: false,
      options: { temperature },
    };
  }
  return {
    model,
    messages: toOpenAiMessages(turns),
    ...(tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
    temperature,
    stream: false,
  };
}

export interface ParsedReply {
  content: string;
  toolCalls: PendingToolCall[];
  usage?: { promptTokens?: number; completionTokens?: number };
}

let callSeq = 0;
function nextCallId(name: string): string {
  callSeq += 1;
  return `call_${name}_${Date.now().toString(36)}_${callSeq}`;
}

function safeJson(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export function parseResponse(preset: ProviderPreset, payload: unknown): ParsedReply {
  const body = (payload ?? {}) as Record<string, unknown>;

  if (preset.wire === "ollama") {
    const message = (body.message ?? {}) as Record<string, unknown>;
    const rawCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as unknown[]) : [];
    return {
      content: typeof message.content === "string" ? message.content : "",
      toolCalls: rawCalls.map((raw) => {
        const call = (raw ?? {}) as Record<string, unknown>;
        const fn = (call.function ?? {}) as Record<string, unknown>;
        const name = String(fn.name ?? "");
        return { id: nextCallId(name), name, args: safeJson(fn.arguments) };
      }),
      usage: {
        promptTokens: Number(body.prompt_eval_count ?? 0) || undefined,
        completionTokens: Number(body.eval_count ?? 0) || undefined,
      },
    };
  }

  const choices = Array.isArray(body.choices) ? (body.choices as unknown[]) : [];
  const first = (choices[0] ?? {}) as Record<string, unknown>;
  const message = (first.message ?? {}) as Record<string, unknown>;
  const rawCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as unknown[]) : [];
  const usage = (body.usage ?? {}) as Record<string, unknown>;
  return {
    content: typeof message.content === "string" ? message.content : "",
    toolCalls: rawCalls.map((raw) => {
      const call = (raw ?? {}) as Record<string, unknown>;
      const fn = (call.function ?? {}) as Record<string, unknown>;
      const name = String(fn.name ?? "");
      return {
        id: typeof call.id === "string" && call.id ? call.id : nextCallId(name),
        name,
        args: safeJson(fn.arguments),
      };
    }),
    usage: {
      promptTokens: Number(usage.prompt_tokens ?? 0) || undefined,
      completionTokens: Number(usage.completion_tokens ?? 0) || undefined,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Network                                                             */
/* ------------------------------------------------------------------ */

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> }>;

function headersFor(config: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey.trim()) headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  return headers;
}

export async function callProvider(
  providerId: string,
  config: ProviderConfig,
  turns: ChatTurn[],
  options: {
    tools?: unknown[];
    timeoutMs?: number;
    temperature?: number;
    fetchImpl?: FetchLike;
    signal?: AbortSignal;
  } = {},
): Promise<ParsedReply & { latencyMs: number; endpoint: string }> {
  const preset = getProvider(providerId);
  if (!preset) throw new Error(`Unknown provider: ${providerId}`);
  if (!config.baseUrl.trim()) throw new Error("No base URL configured for this provider.");
  if (!config.model.trim()) throw new Error("No model configured for this provider.");

  const doFetch = (options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike));
  const endpoint = chatEndpoint(preset, config.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  const started = Date.now();

  try {
    const response = await doFetch(endpoint, {
      method: "POST",
      headers: headersFor(config),
      body: JSON.stringify(
        buildRequestBody(
          preset,
          config.model,
          turns,
          options.tools ?? [],
          options.temperature ?? 0.2,
        ),
      ),
      signal: options.signal ?? controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${preset.name} returned ${response.status}: ${text.slice(0, 400)}`);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`${preset.name} returned a non-JSON body: ${text.slice(0, 200)}`);
    }
    return { ...parseResponse(preset, payload), latencyMs: Date.now() - started, endpoint };
  } finally {
    clearTimeout(timeout);
  }
}

export interface ProbeResult {
  ok: boolean;
  status: number;
  message: string;
  models: string[];
  latencyMs: number;
  endpoint: string;
}

export async function probeProvider(
  providerId: string,
  config: ProviderConfig,
  fetchImpl?: FetchLike,
): Promise<ProbeResult> {
  const preset = getProvider(providerId);
  const started = Date.now();
  if (!preset) {
    return { ok: false, status: 0, message: `Unknown provider “${providerId}”.`, models: [], latencyMs: 0, endpoint: "" };
  }
  const endpoint = modelsEndpoint(preset, config.baseUrl);
  const doFetch = fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  if (!config.baseUrl.trim()) {
    return { ok: false, status: 0, message: "Add a base URL first.", models: [], latencyMs: 0, endpoint };
  }
  try {
    const response = await doFetch(endpoint, { method: "GET", headers: headersFor(config) });
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `Endpoint answered ${response.status}. ${text.slice(0, 200)}`,
        models: [],
        latencyMs: Date.now() - started,
        endpoint,
      };
    }
    const payload = (JSON.parse(text) ?? {}) as Record<string, unknown>;
    const models =
      preset.wire === "ollama"
        ? (Array.isArray(payload.models) ? payload.models : []).map((m) => String((m as Record<string, unknown>).name ?? ""))
        : (Array.isArray(payload.data) ? payload.data : []).map((m) => String((m as Record<string, unknown>).id ?? ""));
    return {
      ok: true,
      status: response.status,
      message: models.length
        ? `Reachable — ${models.length} model(s) available.`
        : "Reachable, but the endpoint listed no models.",
      models: models.filter(Boolean),
      latencyMs: Date.now() - started,
      endpoint,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: 0,
      message: `${reason}. If the server is local, check it allows this origin (CORS) and that the port is open.`,
      models: [],
      latencyMs: Date.now() - started,
      endpoint,
    };
  }
}

/** A one-line CORS/setup hint shown under each local provider. */
export function setupHint(providerId: string): string {
  switch (providerId) {
    case "ollama":
      return "OLLAMA_ORIGINS=\"*\" ollama serve";
    case "vllm":
      return "vllm serve <model> --host 0.0.0.0 --port 8000";
    case "llamacpp":
      return "llama-server -m model.gguf --host 0.0.0.0 --port 8080 --jinja";
    case "localai":
      return "docker run -p 8080:8080 localai/localai:latest";
    case "lmstudio":
      return "Developer → Server → Enable CORS";
    case "tgi":
      return "text-generation-launcher --model-id <model> --port 8080";
    default:
      return "";
  }
}
