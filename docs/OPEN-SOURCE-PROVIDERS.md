# Open-source and self-hosted model providers

The operator ships with **15 providers**. Seven are local runtimes you own, six
are hosted endpoints that serve open-weight models, one is a router, and one is
"anything OpenAI-compatible". The default is *offline* — no endpoint at all —
because the tool registry works without a model.

Everything in this document is configured from **Bill Agent → Providers**. Keys
are stored in your browser and sent only to the endpoint you typed; the app has
no proxy and no server-side key store.

---

## 1. The catalogue

| Provider | Kind | Licence | Default base URL | Wire | Key |
| --- | --- | --- | --- | --- | --- |
| Ollama | local | MIT | `http://127.0.0.1:11434` | Ollama | no |
| vLLM | local | Apache-2.0 | `http://127.0.0.1:8000/v1` | OpenAI | no |
| llama.cpp server | local | MIT | `http://127.0.0.1:8080/v1` | OpenAI | no |
| LocalAI | local | MIT | `http://127.0.0.1:8080/v1` | OpenAI | no |
| LM Studio | local | proprietary (free) | `http://127.0.0.1:1234/v1` | OpenAI | no |
| Text Generation WebUI | local | AGPL-3.0 | `http://127.0.0.1:5000/v1` | OpenAI | no |
| Hugging Face TGI | local | Apache-2.0 | `http://127.0.0.1:8080/v1` | OpenAI | no |
| OpenRouter | router | aggregator | `https://openrouter.ai/api/v1` | OpenAI | yes |
| Groq | cloud | hosted | `https://api.groq.com/openai/v1` | OpenAI | yes |
| Together | cloud | hosted | `https://api.together.xyz/v1` | OpenAI | yes |
| DeepSeek | cloud | hosted | `https://api.deepseek.com/v1` | OpenAI | yes |
| Mistral | cloud | hosted (weights open for some) | `https://api.mistral.ai/v1` | OpenAI | yes |
| Fireworks | cloud | hosted | `https://api.fireworks.ai/inference/v1` | OpenAI | yes |
| Cerebras | cloud | hosted | `https://api.cerebras.ai/v1` | OpenAI | yes |
| Novita | cloud | hosted | `https://api.novita.ai/v3/openai` | OpenAI | yes |
| Custom | any | — | whatever you type | OpenAI | optional |

Two wires only: **OpenAI** (`POST {base}/chat/completions`, `GET {base}/models`)
and **Ollama** (`POST {base}/api/chat`, `GET {base}/api/tags`). If your runtime
speaks either, it works; `custom` covers the rest without a code change.

---

## 2. Local runtimes, with the exact commands

### Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b-instruct      # or llama3.1:8b, mistral-small, phi-4
ollama serve                          # listens on 127.0.0.1:11434
```

Because the app calls this **from the browser**, Ollama must allow the origin:

```bash
export OLLAMA_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,https://panel.alolabs.net"
```

Set the provider base URL to `http://127.0.0.1:11434` (no `/v1`, no trailing
slash — the app normalises either way) and press **Test**.

### vLLM

```bash
pip install vllm
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --port 8000 --enable-auto-tool-choice --tool-call-parser hermes
```

`--enable-auto-tool-choice` matters: without a tool-call parser the model's
JSON never becomes a tool call. Base URL: `http://127.0.0.1:8000/v1`.

### llama.cpp server

```bash
llama-server -m ./models/qwen2.5-7b-instruct-q4_k_m.gguf \
  --port 8080 --host 127.0.0.1 --jinja
```

`--jinja` is required for the OpenAI-compatible tool-calling path. Base URL:
`http://127.0.0.1:8080/v1`.

### LocalAI

```bash
docker run -p 8080:8080 --name local-ai \
  -v $PWD/models:/models localai/localai:latest
```

Base URL `http://127.0.0.1:8080/v1`. Model names are whatever you installed
(`local-ai models list`).

### LM Studio

Load a model, open **Developer → Start Server** (port 1234), and enable
**Serve on Local Network** only if you need another machine to reach it. Base
URL `http://127.0.0.1:1234/v1`.

### Text Generation WebUI

```bash
./start_linux.sh --api --listen
```

Base URL `http://127.0.0.1:5000/v1`. Tool calling depends on the template; if
your model cannot call tools, use the offline grammar or pick a tool-trained
model.

### Hugging Face TGI

```bash
docker run --gpus all -p 8080:80 ghcr.io/huggingface/text-generation-inference:latest \
  --model-id Qwen/Qwen2.5-7B-Instruct
```

Base URL `http://127.0.0.1:8080/v1`.

---

## 3. Model advice (for tool calling, not chat)

Tool calling is a separate skill from prose. Models that reliably emit valid
arguments for a 55-tool registry, roughly from smallest to largest:

| Model class | Notes |
| --- | --- |
| Qwen 2.5 7B Instruct / Qwen3 8B | The best small tool-callers in practice; run with `qwen`/`hermes` parsers. |
| Llama 3.1 / 3.3 8B Instruct | Solid, occasionally drops a required field — the validator catches it. |
| Mistral Small 3 / Magistral | Fast, good JSON hygiene. |
| DeepSeek V3 / R1 distills | Strong planning; larger memory footprint. |
| Phi-4 14B | Good reasoning, weaker at strict JSON. |
| Gemma 3 12B | Fine for prose-heavy tools, weaker on nested arguments. |

Rules of thumb:

- **Below ~7B**, tool calling gets flaky. The runtime recovers (the error is fed
  back), but a run may hit the step budget. Start at 8 steps.
- **Quantisation**: Q4_K_M is the usual sweet spot; Q2 breaks JSON formatting.
- **Context**: 8k is enough for this registry (the schemas are compact); 16k is
  comfortable for long note searches.

---

## 4. What actually leaves the machine

| Setup | Data path | Cost |
| --- | --- | --- |
| Local runtime (Ollama, vLLM, llama.cpp, LocalAI, LM Studio, TGW, TGI) | browser → `127.0.0.1` | electricity |
| OpenRouter / Groq / Together / DeepSeek / Mistral / Fireworks / Cerebras / Novita | browser → provider | per token |
| Offline | nothing leaves | free |

The app never sends workspace data anywhere on its own. If you pick offline, no
request is made at all — the grammar runs locally.

---

## 5. Troubleshooting the probe

The Providers tab probes `GET {base}/models` (OpenAI wire) or
`GET {base}/api/tags` (Ollama wire) and reports the status code, latency and
model list.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Failed to fetch` with a local URL | server not running, or CORS blocked | start the runtime; allow the app origin (`OLLAMA_ORIGINS`, `--api-listen`, vLLM `--allowed-origins`) |
| `401` / `403` | missing or wrong key | paste the key, save, probe again |
| `404` on the endpoint | base URL has the wrong suffix | the app strips `/chat/completions` and a trailing `/`; type `http://127.0.0.1:8000/v1` |
| `200` but no models | runtime has no models pulled | `ollama pull …` |
| Mixed content blocked | app served over HTTPS, runtime on `http://127.0.0.1` | most browsers exempt loopback; otherwise run the app on `http://localhost` |
| Tool calls arrive as plain text | model/parser not enabled | `--enable-auto-tool-choice`, `--jinja`, or choose a tool-trained model |
| Calls work, results ignored | model does not read tool results | raise `maxSteps` once; if it persists, switch model |

---

## 6. Adding a provider

The catalogue is data, not code paths. In `src/lib/agent/providers.ts`:

```ts
{
  id: "my-runtime",
  name: "My runtime",
  kind: "local",
  openSource: true,
  licence: "Apache-2.0",
  homepage: "https://…",
  docs: "https://…",
  defaultBaseUrl: "http://127.0.0.1:9000/v1",
  requiresKey: false,
  wire: "openai",              // or "ollama"
  suggestedModels: ["my-model"],
}
```

Add the id to the docs table, run `npm test` (the provider test iterates the
catalogue and asserts URL normalisation and both parsers), and the Providers tab
plus the manifest pick it up with no other change.

---

## 7. Keeping the slot open

This is a standing requirement of the product: **the open-source provider slot
stays open**. Nothing in the app assumes a hosted vendor, no model id is
hard-coded into a tool, and adding a runtime never requires touching the
registry. The offline grammar means the product is fully usable even if every
provider is removed.
