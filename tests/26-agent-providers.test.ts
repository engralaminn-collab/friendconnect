import { describe, expect, it } from "vitest";
import {
  PROVIDERS,
  buildRequestBody,
  chatEndpoint,
  getProvider,
  modelsEndpoint,
  normalizeBaseUrl,
  parseResponse,
  probeProvider,
  type FetchLike,
} from "@/lib/agent/providers";
import type { ChatTurn } from "@/lib/agent/types";

const ollama = getProvider("ollama")!;
const vllm = getProvider("vllm")!;

const turns: ChatTurn[] = [
  { role: "system", content: "be brief" },
  { role: "user", content: "add a task" },
];

describe("provider catalogue", () => {
  it("is open-source first and free of duplicate ids", () => {
    const ids = PROVIDERS.map((provider) => provider.id);
    expect(new Set(ids).size).toBe(ids.length);
    const openSource = PROVIDERS.filter((provider) => provider.openSource);
    expect(openSource.length).toBeGreaterThanOrEqual(10);
    expect(openSource.map((provider) => provider.id)).toContain("ollama");
    expect(PROVIDERS.filter((provider) => provider.kind === "local").map((provider) => provider.id)).toEqual(
      expect.arrayContaining(["ollama", "vllm", "llamacpp", "localai", "lmstudio", "tgi"]),
    );
  });

  it("only requires a key where the provider actually needs one", () => {
    expect(getProvider("ollama")!.requiresKey).toBe(false);
    expect(getProvider("openrouter")!.requiresKey).toBe(true);
  });
});

describe("url handling", () => {
  it("normalises what an operator actually pastes", () => {
    expect(normalizeBaseUrl(" 127.0.0.1:11434 ")).toBe("http://127.0.0.1:11434");
    expect(normalizeBaseUrl("http://host:8080/v1/")).toBe("http://host:8080/v1");
    expect(normalizeBaseUrl("https://openrouter.ai/api/v1/chat/completions")).toBe(
      "https://openrouter.ai/api/v1",
    );
    expect(normalizeBaseUrl("")).toBe("");
  });

  it("derives the right endpoints per wire", () => {
    expect(chatEndpoint(ollama, "http://127.0.0.1:11434")).toBe("http://127.0.0.1:11434/api/chat");
    expect(modelsEndpoint(ollama, "http://127.0.0.1:11434")).toBe("http://127.0.0.1:11434/api/tags");
    expect(chatEndpoint(vllm, "http://127.0.0.1:8000/v1/")).toBe("http://127.0.0.1:8000/v1/chat/completions");
  });
});

describe("request building", () => {
  it("builds an OpenAI-shaped body with tools", () => {
    const body = buildRequestBody(vllm, "Qwen/Qwen2.5-14B-Instruct", turns, [{ type: "function" }]);
    expect(body.model).toBe("Qwen/Qwen2.5-14B-Instruct");
    expect(body.tool_choice).toBe("auto");
    expect(body.stream).toBe(false);
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("builds an Ollama-shaped body without tool_choice", () => {
    const body = buildRequestBody(ollama, "qwen2.5", turns, []);
    expect(body).not.toHaveProperty("tool_choice");
    expect(body.options).toEqual({ temperature: 0.2 });
  });

  it("serialises assistant tool calls back into the transcript", () => {
    const body = buildRequestBody(
      vllm,
      "m",
      [
        ...turns,
        {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "call_1", name: "create_task", args: { title: "X" } }],
        },
        { role: "tool", content: "Task created", toolCallId: "call_1", name: "create_task" },
      ],
      [],
    );
    const messages = body.messages as Array<Record<string, unknown>>;
    expect(messages[2].tool_calls).toBeDefined();
    expect(messages[3].tool_call_id).toBe("call_1");
  });
});

describe("response parsing", () => {
  it("reads OpenAI tool calls with JSON-string arguments", () => {
    const parsed = parseResponse(vllm, {
      choices: [
        {
          message: {
            content: "",
            tool_calls: [
              { id: "call_abc", type: "function", function: { name: "create_task", arguments: '{"title":"X"}' } },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
    expect(parsed.toolCalls[0].name).toBe("create_task");
    expect(parsed.toolCalls[0].args).toEqual({ title: "X" });
    expect(parsed.usage?.promptTokens).toBe(10);
  });

  it("reads Ollama tool calls with object arguments and mints ids", () => {
    const parsed = parseResponse(ollama, {
      message: {
        content: "",
        tool_calls: [{ function: { name: "workspace_snapshot", arguments: {} } }],
      },
      prompt_eval_count: 12,
      eval_count: 3,
    });
    expect(parsed.toolCalls).toHaveLength(1);
    expect(parsed.toolCalls[0].id).toMatch(/^call_/);
    expect(parsed.usage?.completionTokens).toBe(3);
  });

  it("survives a malformed argument string", () => {
    const parsed = parseResponse(vllm, {
      choices: [{ message: { tool_calls: [{ function: { name: "x", arguments: "not json" } }] } }],
    });
    expect(parsed.toolCalls[0].args).toEqual({});
  });
});

describe("probe", () => {
  it("reports reachability and the model list", async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ models: [{ name: "qwen2.5:14b" }, { name: "llama3.3" }] }),
      json: async () => ({}),
    });
    const result = await probeProvider("ollama", { baseUrl: "http://127.0.0.1:11434", apiKey: "", model: "", enabled: true }, fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.models).toEqual(["qwen2.5:14b", "llama3.3"]);
  });

  it("explains a CORS-shaped failure instead of pretending", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError("Failed to fetch");
    };
    const result = await probeProvider("ollama", { baseUrl: "http://127.0.0.1:11434", apiKey: "", model: "", enabled: true }, fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("CORS");
  });

  it("refuses a provider with no base URL", async () => {
    const result = await probeProvider("vllm", { baseUrl: "", apiKey: "", model: "m", enabled: true });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("base URL");
  });
});
