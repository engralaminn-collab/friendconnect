# Open-source providers

Bill Agent talks to any endpoint that speaks one of two wires. The catalogue is
open-weights first: if a model can be self-hosted, it belongs at the top of this
list.

Configure everything at **`/app/bill-agent` → Providers**. Keys are stored in
this browser and sent only to the endpoint they belong to.

## The catalogue

| Provider | Kind | Licence | Wire | Default endpoint |
| --- | --- | --- | --- | --- |
| Ollama | local | MIT | ollama | `http://127.0.0.1:11434` |
| vLLM | local | Apache-2.0 | openai | `http://127.0.0.1:8000/v1` |
| llama.cpp server | local | MIT | openai | `http://127.0.0.1:8080/v1` |
| LocalAI | local | MIT | openai | `http://127.0.0.1:8080/v1` |
| LM Studio | local | proprietary, free | openai | `http://127.0.0.1:1234/v1` |
| Hugging Face TGI | local | Apache-2.0 | openai | `http://127.0.0.1:8080/v1` |
| OpenRouter | cloud | models vary | openai | `https://openrouter.ai/api/v1` |
| Groq | cloud | hosted open weights | openai | `https://api.groq.com/openai/v1` |
| Together AI | cloud | hosted open weights | openai | `https://api.together.xyz/v1` |
| DeepSeek | cloud | MIT weights | openai | `https://api.deepseek.com/v1` |
| Mistral | cloud | Apache-2.0 (most) | openai | `https://api.mistral.ai/v1` |
| Fireworks | cloud | hosted open weights | openai | `https://api.fireworks.ai/inference/v1` |
| Cerebras | cloud | hosted open weights | openai | `https://api.cerebras.ai/v1` |
| Novita | cloud | hosted open weights | openai | `https://api.novita.ai/v3/openai` |
| Custom | any | yours | openai | `http://127.0.0.1:4000/v1` |

"Hosted open weights" means the licence of the model is open, the hardware is
not. Nothing in the code assumes a particular vendor.

## Which model do I actually need?

A tool-calling operator is a different job from a chat model: it must emit
structured calls and stop cleanly. In practice:

- **Reliable tool calls** — Qwen 2.5/3 (14B and up), Llama 3.3 70B, Mistral
  Small 3.x, DeepSeek V3.
- **Do not bother below ~7B** for multi-step work; the loop will stop at the
  repetition guard because the model re-issues the same call.
- **Long transcripts** (a 40-row list_contacts result plus a schema) need 16k+
  context. Trim with `limit` arguments instead of a bigger model.

## Local setup, verbatim

### Ollama (the default recommendation)

```bash
curl -fsSL https://ollama.com/install.sh | sh
OLLAMA_ORIGINS="*" ollama serve          # allow the browser in
ollama pull qwen2.5:14b                  # ~9 GB, good tool calling
```

In Providers: base URL `http://127.0.0.1:11434`, model `qwen2.5:14b`, no key,
press **Test connection**, then **Use this**.

`OLLAMA_ORIGINS="*"` is a development convenience. On a laptop that reaches the
public internet, prefer `OLLAMA_ORIGINS="http://localhost:3000"`.

### vLLM

```bash
pip install vllm
vllm serve Qwen/Qwen2.5-14B-Instruct \
  --host 0.0.0.0 --port 8000 \
  --enable-auto-tool-choice --tool-call-parser hermes \
  --allowed-origins '["*"]'
```

`--enable-auto-tool-choice` and the parser are not optional: without them vLLM
returns prose where a tool call was expected.

### llama.cpp server

```bash
llama-server -m qwen2.5-14b-instruct-q4_k_m.gguf \
  --host 0.0.0.0 --port 8080 --jinja --ctx-size 16384
```

`--jinja` is what enables the model's tool template. Put a reverse proxy in front
for TLS; the server's own CORS handling is minimal.

### LocalAI

```bash
docker run -p 8080:8080 --name localai localai/localai:latest
```

### LM Studio

Developer → Local Server → Start, then enable **CORS** in the same panel.

### Hugging Face TGI

```bash
text-generation-launcher --model-id Qwen/Qwen2.5-14B-Instruct --port 8080
```

### Any OpenAI-compatible gateway

LiteLLM, one-api, new-api, unorouter, or your own proxy: choose **Custom**, paste
`http://host:port/v1`, set the model name the gateway exposes. This is the right
choice when several people share one key and you want spend limits in one place.

## Pasting your way out of trouble

The base URL is normalised, so these are all the same endpoint:

```
127.0.0.1:11434
http://127.0.0.1:11434/
http://127.0.0.1:11434/api/chat
```

The endpoint is derived from the wire, not guessed:

| wire | chat | models |
| --- | --- | --- |
| ollama | `{base}/api/chat` | `{base}/api/tags` |
| openai | `{base}/chat/completions` | `{base}/models` |

## When "Test connection" fails

The probe returns the real reason rather than a spinner:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `TypeError: Failed to fetch` | CORS, port closed, or server not running | allow this origin; check the port |
| `401` | missing or wrong key | paste the key, check the provider |
| `404` on `/chat/completions` | base URL missing `/v1` | add it |
| `200` but no models | server started without a model | pull/load a model |
| reachable, but the console loops twice | model has no tool support | pick a tool-capable model, or use offline mode |

## Privacy and cost, stated plainly

- **Local model** — prompts, tool schemas and tool results never leave the
  machine. Cost: electricity. Latency: your GPU.
- **Hosted open weights** — the prompt, the tool catalogue and any tool results
  the model asked to see are sent to that provider. Cost: per token.
- **No FriendConnect proxy** — the browser talks to the endpoint directly, so
  there is no server-side log of your model traffic to leak. The trade is that
  each browser holds its own key.

## Adding a provider

1. Add an entry to `PROVIDERS` in `src/lib/agent/providers.ts` — `wire`,
   `defaultBaseUrl`, `suggestedModels`, `requiresKey`.
2. If it needs a CORS hint, add a line to `setupHint()`.
3. Run `npm test -- tests/26-agent-providers.test.ts`.

It appears in Providers, in the manifest and in `/api/agent/manifest` with no
further wiring.
