# Bill Agent — the workspace operator

Bill is the one AI that can drive the whole workspace. It is not a chat wrapper
around a prompt: it is a **tool registry** (39 tools), a **provider layer** that
prefers open-source models, a **bounded run loop** with four independent stop
conditions, an **audit trail**, and an **HTTP control surface** so something
other than a human can press the buttons.

Route: `/app/bill-agent` — seven tabs: Operate, Tools, Automations, Providers,
Control API, Runs & audit, Deployment.

```
┌───────────────┐   turns    ┌──────────────┐  tool_calls  ┌──────────────┐
│  provider     │◀──────────▶│   runtime    │─────────────▶│   registry   │
│  (or offline) │            │  maxSteps    │◀─────────────│  validate    │
└───────────────┘            │  maxMs       │   results    │  approve     │
                             │  repeatGuard │              │  execute     │
                             └──────┬───────┘              └──────┬───────┘
                                    │                             │
                              audit trail                  workspace store
                            (browser, export)              (contacts, deals,
                                                            students, notes…)
```

---

## 1. Why it works with no model at all

`src/lib/agent/offline.ts` is a deterministic grammar. It reads the task, emits
real tool calls, executes them, and writes the answer from the results it
actually received. There is no hidden "simulation" step anywhere.

Phrases that work out of the box:

| You say | It calls |
| --- | --- |
| `add contact Jane Okafor at Northwind, jane@northwind.dev` | `create_contact` |
| `create a deal Renewal worth 24000 at proposal` | `create_deal` |
| `move Jane Okafor to negotiation` | `move_contact_stage` |
| `add task Chase the DPA signature, priority high` | `create_task` |
| `remind me to send the offer letter` | `create_task` |
| `note: Northwind wants SSO before signature` | `create_note` |
| `log call with Jane Okafor: talked through pricing` | `log_activity` |
| `find Meridian` / `search Meridian` | `search_workspace` |
| `status` / `summary` | `workspace_snapshot` |
| `pipeline forecast` | `pipeline_forecast` |
| `list unread threads` | `list_threads` |
| `send message to Jane Okafor: sending the proposal now` | `send_message` |
| `post to LinkedIn: We shipped a bounded agent loop #agents` | `schedule_social_post` |
| `audit https://example.com/pricing` | `run_seo_audit` |
| `help` | nothing — it lists the grammar |

Connect a provider and the grammar gets out of the way: the model plans, the
grammar does not.

---

## 2. Tool registry

`src/lib/agent/registry.ts` is the single source of truth for the manifest, the
catalogue UI, the schemas sent to the model and the offline vocabulary.

| Group | Tools |
| --- | --- |
| CRM (18) | `list_contacts` `get_contact` `create_contact` `update_contact` `move_contact_stage` `star_contact` `delete_contact` `list_deals` `create_deal` `move_deal` `delete_deal` `pipeline_forecast` `create_company` `qualify_lead` `log_activity` `create_task` `complete_task` `list_tasks` |
| Education (5) | `list_students` `move_student_status` `update_application` `complete_checklist_item` `log_study_session` |
| Marketing (6) | `create_article` `update_article_status` `create_campaign` `set_campaign_status` `schedule_social_post` `run_seo_audit` |
| Knowledge (4) | `create_note` `search_notes` `create_wiki_page` `search_workspace` |
| Messaging (5) | `list_threads` `send_message` `start_thread` `mark_thread_read` `draft_outreach_email` |
| Operations (1) | `workspace_snapshot` |

Every tool declares:

- `name`, `title`, `group`, `description` — what a model reads.
- `risk` — `read`, `write` or `destructive`.
- `requiresApproval` — destructive tools are always `true`.
- `schema` — a strict JSON-schema subset. Unknown arguments are **rejected**,
  not ignored, and errors name the field.

Validation lives in `src/lib/agent/schema.ts` and coerces the two mistakes models
make constantly: numbers written as `"24,000"` and a scalar where an array is
declared.

Adding a tool is ~20 lines: implement `run(ctx, args)` against the
`WorkspacePort`, add it to the group array, run the tests. It appears in the
catalogue, the manifest, the automation picker and the model's tool list with no
further wiring.

---

## 3. Providers — open-source first

`src/lib/agent/providers.ts` ships 15 entries. Six are local runtimes (Ollama,
vLLM, llama.cpp, LocalAI, LM Studio, TGI), eight are hosted open-weight
aggregators, and one is "any OpenAI-compatible endpoint you own". See
[OPEN-SOURCE-PROVIDERS.md](./OPEN-SOURCE-PROVIDERS.md).

Two wires are supported and both are real:

- **openai** — `POST {base}/chat/completions`, `tools[]`, `tool_calls[]`.
- **ollama** — `POST {base}/api/chat`, `tools[]`, `message.tool_calls[]`.

The browser calls the endpoint directly. There is no FriendConnect proxy, so an
API key never leaves the device and a self-hosted model never leaves your
network. The corollary is CORS: a local server must allow this origin, and the UI
says so when a probe fails instead of pretending the model is "thinking".

Fallbacks that are worth knowing about:

- Base URLs are normalised: `127.0.0.1:11434`, `http://x/v1/` and a pasted
  `.../chat/completions` all resolve to one endpoint.
- Some local servers ignore `tools` and answer with JSON. If the reply starts
  with `{` and contains `{"tool": …}`, the runtime converts it into a tool call.
- A probe reports latency, status, the endpoint it actually called and the model
  list the server returned.

---

## 4. The run loop

`src/lib/agent/runtime.ts` — one loop, four independent stop conditions:

| Condition | Meaning |
| --- | --- |
| goal | The model answered without asking for a tool. |
| step budget | Hard ceiling on tool calls (1–30, default 8). |
| repetition guard | Same tool + same arguments twice halts the run. |
| wall-clock budget | 15–300s per run (default 120s). |

A rejected approval stops the run with status `rejected` — it does not skip the
call and continue. A thrown tool becomes a failed step, not a crash. A model
error returns status `error` with the provider's message.

Statuses surface in the console, in run history and in the audit trail.

---

## 5. Approval, dry run and the audit trail

Autonomy (Operate → Run policy):

- **Ask every time** — any write needs a click.
- **Auto-safe** (default) — reads and writes run; destructive tools still ask.
- **Auto-all** — only destructive tools ask.

Destructive tools ask **regardless** of the setting. Dry run reasons about the
arguments and writes nothing.

Every tool call, approval, provider test, run and automation lands in the audit
trail (`localStorage`, 500 most recent) with the arguments and the result, and
can be exported as JSON or CSV. The boundary is stated in the UI: this is a
browser-local log, not a server log.

---

## 6. Automations

An automation is a named tool call with a rhythm: manual, on-open, daily or
weekly. They run when the workspace opens (`useAutomationScheduler`), so there is
no server cron to drift and a closed tab pauses the schedule rather than making
unattended writes.

Presets: morning snapshot, weekly forecast note, follow-up task.

---

## 7. HTTP control surface

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/agent/manifest` | Tool inventory with JSON schemas. No auth, no data. |
| `POST` | `/api/agent/commands` | Queue `{ "tool": "...", "args": {...} }`. 202 + command id. |
| `GET` | `/api/agent/commands?all=1` | Read the queue and settled results. |
| `POST` | `/api/agent/commands/settle` | The operator tab reports `{ id, status, result }`. |
| `DELETE` | `/api/agent/commands` | Empty the queue. |

```bash
curl -sS https://panel.alolabs.net/api/agent/manifest | jq '.counts'

curl -sS -X POST https://panel.alolabs.net/api/agent/commands \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"tool":"create_task","args":{"title":"Follow up with Meridian","priority":"high"}}'
```

**Honest design note:** the workspace store lives in the browser, so an external
caller cannot write to it directly. It queues a command; the open operator tab
drains the queue every four seconds, executes against live state and settles the
command with the real result. Queue state is server memory with a five-minute
TTL — a restart empties it in both directions. If you need unattended execution,
the right move is a headless worker that shares the same registry, not a longer
queue TTL.

Set `AGENT_TOKEN` before exposing the domain. Without it the routes are open,
which the manifest reports.

---

## 8. Files

```
src/lib/agent/
  types.ts        tool contract, WorkspacePort, run + audit types
  schema.ts       argument validation and coercion
  registry.ts     39 tools, manifest, OpenAI tool specs
  providers.ts    15 providers, URL/endpoint/body/response handling, probe
  offline.ts      deterministic planner + responder
  runtime.ts      bounded loop and default system prompt
  agentStore.ts   persisted operator state (providers, runs, audit, automations)
  queue.ts        in-memory remote command queue
src/components/agent/
  useAgentRun.ts  the runner + remote drain + automation scheduler
  AgentConsole.tsx  ToolCatalog.tsx  AutomationsPanel.tsx  ProvidersPanel.tsx
  ControlApiPanel.tsx  AuditPanel.tsx  DeploymentPanel.tsx  widgets.tsx
src/app/app/bill-agent/page.tsx
src/app/api/agent/{manifest,commands,commands/settle}/route.ts
tests/23…27-*.test.ts  (57 tests: registry, runtime, tools, providers, offline)
```

---

## 9. What is deliberately not here

- **No server-side agent loop.** The model never runs on your server and cannot
  write without a browser tab open. That is a product decision, not an omission.
- **No key vault.** Keys live in `localStorage`. On a shared machine, use a
  local model or a key with a spend cap.
- **No prompt-injection defence beyond structure.** Tool results can contain
  text that looks like instructions. The registry limits what a model can do;
  approval limits what it can do unattended. Both bounds are visible.
