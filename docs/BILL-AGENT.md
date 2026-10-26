# Bill Agent — one AI that operates the whole workspace

`/app/bill-agent` is the operator. Not a chat bubble bolted onto the side of the
product: a **tool registry** the AI must use to do anything, a **bounded run
loop**, an **approval gate**, an **audit trail**, and an **HTTP control surface**
so a cron job or another agent can press the buttons too.

```
                     ┌────────────────────────────┐
  task (sentence) ──▶│  runtime                   │
                     │  · goal check              │
                     │  · step budget (1–30)      │
                     │  · wall clock (15–300 s)   │
                     │  · repetition guard        │
                     └───────┬────────────┬───────┘
                             │            │
                   tool_calls│            │results
                             ▼            ▲
                     ┌────────────────────────────┐
                     │ registry — 55 tools        │
                     │ schema → validate → risk   │
                     │ → approval → execute       │
                     └───────┬────────────────────┘
                             │
              ┌──────────────┴───────────────┐
              ▼                              ▼
      workspace store                 audit trail
   (contacts, deals, tasks,        (every call, every
    students, exams, notes,         rejection, exportable
    threads, gateways, …)           as JSON / CSV)
```

Everything runs in the browser. There is no server-side model proxy, no account,
and no key escrow: the provider you choose is called directly from the tab you
are looking at.

---

## 1. Seven tabs

| Tab | What it is for |
| --- | --- |
| **Operate** | The chat. Type a task, watch the steps, approve risky calls, stop the run. |
| **Tools** | All 55 tools with their schemas. Run any tool by hand, with a form. |
| **Automations** | Named tool calls on a manual / on-open / daily / weekly rhythm. |
| **Providers** | 15 endpoints, open-source first, each with a real connection probe. |
| **Control API** | Manifest, curl recipes, an enqueue form and live queue state. |
| **Runs & audit** | Every run with its steps; export JSON or CSV. |
| **Deployment** | Server spec, deploy script, `.env`, and a live health check. |

---

## 2. The tool registry

`src/lib/agent/registry.ts` is the single source of truth: the UI catalogue, the
manifest served over HTTP, the JSON schemas sent to a model, and the tests all
read from it.

| Group | Count | Tools |
| --- | --- | --- |
| CRM | 18 | `list_contacts` `get_contact` `create_contact` `update_contact` `move_contact_stage` `star_contact` `delete_contact` `list_deals` `create_deal` `move_deal` `delete_deal` `pipeline_forecast` `create_company` `qualify_lead` `log_activity` `create_task` `complete_task` `list_tasks` |
| Education | 11 | `list_students` `create_student` `move_student_status` `update_application` `complete_checklist_item` `log_study_session` `list_exam_papers` `start_exam_attempt` `grade_exam_attempt` `list_exam_attempts` `delete_exam_attempt` |
| Marketing | 6 | `create_article` `update_article_status` `create_campaign` `set_campaign_status` `schedule_social_post` `run_seo_audit` |
| Knowledge | 7 | `create_note` `search_notes` `pin_note` `create_wiki_page` `update_wiki_page` `toggle_plugin` `search_workspace` |
| Messaging | 6 | `list_threads` `send_message` `start_thread` `mark_thread_read` `log_call` `draft_outreach_email` |
| Studios | 1 | `save_diagram` |
| Community & operations | 6 | `create_post` `create_event` `update_gateway` `set_kid_safe` `mark_notifications_read` `workspace_snapshot` |

### The contract

```ts
interface ToolDefinition {
  name: string;               // snake_case, unique, stable
  title: string;              // human label
  group: ToolGroup;
  description: string;        // what the model reads
  risk: "read" | "write" | "destructive";
  requiresApproval: boolean;  // force the dialog regardless of policy
  schema: ToolSchema;         // strict subset of JSON Schema
  run(ctx, args): ToolResult | Promise<ToolResult>;
}
```

`ctx` carries only two things: the **workspace port** (the store's public
surface) and `now()`. A tool never imports the store directly, which is why the
same tool runs identically in a browser, in a test with an in-memory workspace,
and (if you ever need it) in a headless worker.

### Validation is not advisory

`src/lib/agent/schema.ts` coerces the near-misses a model actually produces
(`"12"` for a number, a single value where an array was declared, `"yes"` for a
boolean) and rejects everything else **with the field name**:

```
paperId: must be one of: ielts-academic-1, toefl-practice-1, placement-1
answers: unknown argument (allowed: paperId, answers, selfAssessed)
```

`additionalProperties: false` is enforced, so a hallucinated field fails loudly
instead of being silently dropped. That error goes back to the model as the tool
result, which is how the loop recovers instead of guessing.

### Adding a tool

1. Write it in the right group array in `registry.ts` using `readTool` /
   `writeTool` helpers.
2. Add the port methods it needs to `WorkspacePort` in `types.ts` (the real
   store already implements them — if it does not, TypeScript says so).
3. Add it to the in-memory workspace in `tests/helpers/agent-workspace.ts`.
4. That is it: the manifest, the Tools tab, the model's tool list and the HTTP
   control API all pick it up automatically.

---

## 3. The run loop

`src/lib/agent/runtime.ts` stops on **four independent conditions**:

| Condition | Default | Meaning |
| --- | --- | --- |
| Goal reached | — | The model replies with no tool calls. |
| Step budget | 8 (1–30) | Hard cap on tool calls per run. |
| Repetition guard | on | The same tool with the same arguments twice ends the run. |
| Wall clock | 120 s (15–300) | Checked between steps. |
| Operator stop | — | The Stop button releases any pending approval and unwinds. |

A rejected approval **halts** the run rather than skipping the call; a model
that keeps proposing a forbidden tool cannot sneak it through on step nine.

---

## 4. Providers — and running with none

15 endpoints, open-source first, each with a real probe. Two wire formats are
supported: **OpenAI** (`{base}/chat/completions`, `/models`) and **Ollama**
(`{base}/api/chat`, `/api/tags`). Full setup, licence and cost detail:
[OPEN-SOURCE-PROVIDERS.md](OPEN-SOURCE-PROVIDERS.md).

### Offline grammar

With no provider enabled, `src/lib/agent/offline.ts` still **does** things. It
is a deterministic parser that emits real tool calls, executes them, and writes
the answer from the results it actually received:

| You say | It calls |
| --- | --- |
| `add contact Jane Okafor at Northwind, jane@northwind.dev` | `create_contact` |
| `create a deal Renewal worth 24000 at proposal` | `create_deal` |
| `move Jane Okafor to negotiation` | `move_contact_stage` |
| `add task Chase the DPA signature, priority high` | `create_task` |
| `remind me to send the offer letter` | `create_task` |
| `note: Northwind wants SSO before signature` | `create_note` |
| `log call with Jane Okafor: talked through pricing` | `log_activity` |
| `log a call with Jane Okafor for 12 minutes` | `log_call` |
| `add student Amara Okoye amara@example.com` | `create_student` |
| `schedule webinar: Visa routes for Nigerian applicants` | `create_event` |
| `post to the feed: We shipped the operator today` | `create_post` |
| `connect gateway HTTP SMS` | `update_gateway` |
| `turn kid safe on` | `set_kid_safe` |
| `mark notifications read` | `mark_notifications_read` |
| `create a diagram Enquiry to enrolment: Enquiry, Counselling, Application` | `save_diagram` |
| `find Meridian` / `search Meridian` | `search_workspace` |
| `status` / `summary` | `workspace_snapshot` |
| `pipeline forecast` | `pipeline_forecast` |
| `list unread threads` | `list_threads` |
| `send message to Jane Okafor: sending the proposal now` | `send_message` |
| `post to LinkedIn: We shipped a bounded agent loop` | `schedule_social_post` |
| `audit https://example.com/pricing` | `run_seo_audit` |
| `help` | nothing — it lists the grammar |

The grammar is the floor, not the ceiling: connect a model and it stops
pattern-matching and starts planning.

---

## 5. Control API

Anything that can make an HTTP request can operate the workspace: cron, n8n, a
chat-ops bot, another agent.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/agent/manifest` | Every tool with its schema, groups, provider ids. No data. |
| `POST` | `/api/agent/commands` | `{ tool, args }` → `202` with an id. |
| `GET` | `/api/agent/commands?all=1` | Pending (or all) commands with their results. |
| `POST` | `/api/agent/commands/settle` | `{ id, status, result }` — the tab reports back. |
| `DELETE` | `/api/agent/commands` | Drop the queue. |

```bash
curl -sS -X POST https://panel.alolabs.net/api/agent/commands \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -d '{"tool":"create_task","args":{"title":"Follow up with Meridian","priority":"high"}}'
```

Authentication: if `AGENT_TOKEN` is set, the bearer header (or `?token=`) is
required. If it is **not** set, the endpoints are open — fine on localhost,
wrong on a public domain. The manifest states which mode is active rather than
pretending.

Honest detail: the queue lives in **server memory** with a short TTL and is
drained by the **open operator tab**, because only the browser holds workspace
state. Queue a command with no tab open and it waits, then expires. That is a
deliberate limit, not a bug: the alternative is a server that mutates a
database behind the operator's back.

---

## 6. Safety

- **Destructive tools always ask.** `delete_contact`, `delete_deal` and
  `delete_exam_attempt` prompt even with autonomy set to *auto-all*.
- **Three autonomy levels:** *ask every write*, *auto-safe* (writes run, deletes
  still ask), *auto-all*.
- **Dry run** validates and short-circuits every write, so you can see what the
  plan would do without touching data.
- **Audit** records tool, arguments, risk, outcome and duration. Export as JSON
  or CSV; the last 500 entries live in the browser.
- **No key leaves the browser.** Provider keys are stored in localStorage and
  sent only to the endpoint you configured.

---

## 7. The exam room is part of the operator's surface

The computer-based English test lives at `/app/exam` and is fully operable by
Bill Agent:

- `list_exam_papers` → sections, timings, how many questions are auto-marked
- `start_exam_attempt` → a timed draft
- `grade_exam_attempt` → marks objective answers, blends the productive
  self-assessment, stores band + CEFR + per-question review
- `list_exam_attempts` / `delete_exam_attempt` → history

Papers ship with original passages (nothing copied from a published test) and
follow the public task types: multiple choice, multi-select, gap-fill, chart
description, discussion essay, long turn. Scoring uses the published IELTS
raw-score tables and scales TOEFL sets to the 0–120 total.

---

## 8. File map

```
src/lib/agent/
  types.ts        tool contract, port, run and audit types
  schema.ts       validation + coercion
  registry.ts     the 55 tools, manifest, OpenAI tool specs
  runtime.ts      the bounded loop
  providers.ts    catalogue, URL normalisation, both wires, probes
  offline.ts      the deterministic grammar and its summaries
  agentStore.ts   persisted operator state (providers, chat, runs, audit)
src/components/agent/
  AgentConsole.tsx     Operate tab, approval dialog, stop button
  ToolCatalog.tsx      schema-driven forms
  AutomationsPanel.tsx schedules and manual runs
  ProvidersPanel.tsx   probe, model list, endpoint editing
  ControlApiPanel.tsx  curl, enqueue, live queue
  AuditPanel.tsx       runs, steps, export
  DeploymentPanel.tsx  server spec and health check
  useAgentRun.ts       the only path a tool can execute through
src/app/api/agent/
  manifest/route.ts    public catalogue
  commands/route.ts    queue (GET/POST/DELETE)
  commands/settle/...  result reporting
src/app/app/bill-agent/page.tsx
```

---

## 9. Limits, stated plainly

- The remote queue is memory-only, TTL-bounded, and needs an open tab.
- The audit trail is browser-local, not a server log; clearing site data clears it.
- Model quality is the model's problem: the loop bounds cost and damage, it does
  not make a 3B model plan like a 70B one.
- Provider calls from a browser are subject to CORS. Local runtimes need their
  origin allow-list configured (see the provider doc); cloud endpoints work as
  shipped.
- There is no multi-user sync. Two people with two browsers have two workspaces.
