/* ============================================================
   Bill Agent — offline planner and responder
   ------------------------------------------------------------
   No provider configured? The operator still works. This module
   reads the task with a small deterministic grammar, emits real
   tool calls, then writes the answer from the tool results it
   actually received. No network, no model, no invented facts.
   ============================================================ */

import type { ChatTurn, PendingToolCall } from "./types";
import type { Decision } from "./runtime";

const STAGE_WORDS: Record<string, string> = {
  lead: "lead",
  leads: "lead",
  qualified: "qualified",
  qualify: "qualified",
  proposal: "proposal",
  negotiate: "negotiation",
  negotiation: "negotiation",
  won: "won",
  win: "won",
  lost: "lost",
  lose: "lost",
};

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const URL = /https?:\/\/[^\s)]+/i;

function callId(name: string, index: number): string {
  return `offline_${name}_${index}_${Math.random().toString(36).slice(2, 7)}`;
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^["'“”]|["'“”]$/g, "").trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function money(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[£$,\s]/g, "").replace(/k$/i, "000");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const OFFLINE_EXAMPLES = [
  "add contact Jane Okafor at Northwind, jane@northwind.dev",
  "create a deal Renewal — Northwind worth 24000 at proposal",
  "move Jane Okafor to negotiation",
  "add task Chase the DPA signature, priority high",
  "remind me to send the offer letter",
  "note: Northwind wants SSO before signature",
  "log call with Jane Okafor: talked through pricing",
  "find Meridian",
  "status",
  "pipeline forecast",
  "list unread threads",
  "send message to Jane Okafor: sending the proposal now",
  "post to LinkedIn: We shipped a bounded agent loop today",
  "audit https://example.com/pricing",
  "add student Amara Okoye amara@example.com",
  "schedule webinar: Visa routes for Nigerian applicants",
  "log a call with Jane Okafor for 12 minutes",
  "post to the feed: We shipped the operator today",
  "create a diagram Enquiry to enrolment: Enquiry, Counselling, Application, Offer, Visa",
  "connect gateway HTTP SMS",
];

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

export function planOffline(task: string): Decision {
  const raw = task.trim();
  const text = raw.toLowerCase();
  const calls: PendingToolCall[] = [];
  const push = (name: string, args: Record<string, unknown>) =>
    calls.push({ id: callId(name, calls.length), name, args });

  if (!raw) {
    return { content: "Give me a task and I will act on the workspace.", toolCalls: [] };
  }

  if (/^(help|commands|what can you do|capabilities)\b/.test(text)) {
    return {
      content: [
        "I can drive every module through the tool registry. Without a provider I use a deterministic grammar, so these phrases work right now:",
        "",
        ...OFFLINE_EXAMPLES.map((example) => `• ${example}`),
        "",
        "Connect a provider (Ollama locally, or any OpenAI-compatible endpoint) on the Providers tab and I will plan freely instead of pattern-matching.",
      ].join("\n"),
      toolCalls: [],
    };
  }

  if (/^(hi|hey|hello|yo)\b/.test(text) && text.length < 20) {
    return {
      content:
        "Hello. I am Bill, the workspace operator. Say “help” to see the offline grammar, or connect a provider so I can plan without it.",
      toolCalls: [],
    };
  }

  // Search / lookup must come before "create" rules.
  const findMatch = raw.match(/^(?:find|search|look ?up|who is|show me)\s+(.+)$/i);
  if (findMatch) {
    push("search_workspace", { query: stripQuotes(findMatch[1]), limit: 5 });
    return { content: `Searching the workspace for “${stripQuotes(findMatch[1])}”.`, toolCalls: calls };
  }

  const moveMatch = raw.match(/\b(?:move|stage|advance|put)\s+(.+?)\s+(?:to|into)\s+(\w+)\s*$/i);
  if (moveMatch && STAGE_WORDS[moveMatch[2].toLowerCase()]) {
    const target = stripQuotes(moveMatch[1]);
    if (/\bdeal\b/i.test(raw)) {
      push("move_deal", { query: target.replace(/\bdeal\b/gi, "").trim(), stage: STAGE_WORDS[moveMatch[2].toLowerCase()] });
    } else {
      push("move_contact_stage", { query: target, stage: STAGE_WORDS[moveMatch[2].toLowerCase()] });
    }
    return { content: `Moving ${target} to ${STAGE_WORDS[moveMatch[2].toLowerCase()]}.`, toolCalls: calls };
  }

  const contactMatch = raw.match(/\b(?:add|create|new|save)\s+(?:a\s+|the\s+)?contact\b[:,]?\s*(.+)$/i);
  if (contactMatch) {
    const body = contactMatch[1];
    const email = body.match(EMAIL)?.[0] ?? "";
    const companyMatch = body.match(/\b(?:at|from|works at)\s+([A-Z][\w&.\- ]+)/);
    let name = body
      .replace(email, "")
      .replace(/\b(?:at|from|works at)\s+[A-Z][\w&.\- ]+/g, "")
      .replace(/\b(?:email|mail)\b/gi, "")
      .replace(/[,;]+/g, " ")
      .trim();
    name = stripQuotes(name);
    if (!email) {
      return {
        content:
          "I need an email address before I create a contact — try “add contact Jane Okafor at Northwind, jane@northwind.dev”.",
        toolCalls: [],
      };
    }
    push("create_contact", {
      name: titleCase(name) || email.split("@")[0],
      email,
      company: companyMatch ? companyMatch[1].trim() : undefined,
      source: "Bill Agent (offline)",
    });
    return { content: `Creating ${titleCase(name) || email} from ${email}.`, toolCalls: calls };
  }

  const dealMatch = raw.match(/\b(?:add|create|new|open)\s+(?:a\s+|the\s+)?deal\b[:,]?\s*(.+)$/i);
  if (dealMatch) {
    const body = dealMatch[1];
    const amount = money(body.match(/(?:worth|value|£|\$)\s*([\d,._k]+)/i)?.[1]);
    const stageWord = body.match(/\bat\s+(lead|qualified|proposal|negotiation|won|lost)\b/i)?.[1];
    const contact = body.match(/\bfor\s+([A-Z][\w.\- ]+)$/)?.[1];
    const title = stripQuotes(
      body
        .replace(/(?:worth|value|£|\$)\s*[\d,._k]+/i, "")
        .replace(/\bat\s+(lead|qualified|proposal|negotiation|won|lost)\b/i, "")
        .replace(/\bfor\s+[A-Z][\w.\- ]+$/, "")
        .trim(),
    );
    if (!title) return { content: "Give the deal a title, e.g. “create deal Renewal worth 24000”.", toolCalls: [] };
    push("create_deal", {
      title: titleCase(title),
      value: amount ?? 0,
      stage: stageWord ? STAGE_WORDS[stageWord.toLowerCase()] : "proposal",
      contact: contact ? stripQuotes(contact) : undefined,
      tags: ["agent"],
    });
    return { content: `Creating the deal “${titleCase(title)}”.`, toolCalls: calls };
  }

  const noteMatch = raw.match(/^(?:note|remember|jot down)\b[:\s]+(.+)$/i);
  if (noteMatch) {
    const body = noteMatch[1];
    const [head, ...rest] = body.split(/[:—]\s*/);
    const title = head.length > 60 ? `${head.slice(0, 57)}…` : head;
    push("create_note", {
      title: stripQuotes(title),
      content: rest.join(": ") || body,
      tags: ["agent"],
    });
    return { content: `Saving the note “${stripQuotes(title)}”.`, toolCalls: calls };
  }

  const logMatch = raw.match(/^log\s+(?:a\s+)?(call|email|meeting|note|task)\b(?:\s+(?:with|for)\s+([^:]+))?:?\s*(.*)$/i);
  if (logMatch && logMatch[1].toLowerCase() === "call") {
    const contact = stripQuotes(logMatch[2] ?? "").replace(/\s+for\s+\d+\s*(?:min|minutes)?$/i, "").trim();
    const minutes = Number(raw.match(/\bfor\s+(\d+)\s*(?:min|minutes)\b/i)?.[1] ?? 0);
    // A duration turns this into a call record; without one it stays an
    // activity log entry, which keeps the older phrasing working.
    if (contact && minutes > 0) {
      push("log_call", {
        contactName: contact,
        direction: /incoming|received/i.test(text) ? "incoming" : "outgoing",
        kind: /video/i.test(text) ? "video" : "audio",
        durationSec: minutes * 60,
      });
      return {
        content: `Logging a ${minutes}-minute call with ${contact}.`,
        toolCalls: calls,
      };
    }
  }
  if (logMatch) {
    const [, type, contact, title] = logMatch;
    push("log_activity", {
      type: type.toLowerCase(),
      title: stripQuotes(title || `${titleCase(type)} logged by Bill Agent`),
      contact: contact ? stripQuotes(contact) : undefined,
      done: true,
    });
    return { content: `Logging the ${type.toLowerCase()}.`, toolCalls: calls };
  }

  const taskMatch =
    raw.match(/\b(?:add|create|new)\s+task\b[:,]?\s*(.+)$/i) ||
    raw.match(/^remind me to\s+(.+)$/i) ||
    raw.match(/^todo[:\s]+(.+)$/i);
  if (taskMatch) {
    const body = taskMatch[1];
    const priority = /high|urgent|asap/i.test(body) ? "high" : /low|someday/i.test(body) ? "low" : "medium";
    const title = stripQuotes(body.replace(/,?\s*priority\s*:?\s*(low|medium|high)/i, "").replace(/,\s*(high|medium|low)$/i, ""));
    push("create_task", { title, priority, module: "Agent" });
    return { content: `Adding the task “${title}” (${priority} priority).`, toolCalls: calls };
  }

  const completeMatch = raw.match(/\b(?:complete|finish|done with)\s+(?:the\s+)?task\b[:,]?\s*(.+)$/i);
  if (completeMatch) {
    push("complete_task", { query: stripQuotes(completeMatch[1]) });
    return { content: `Completing “${stripQuotes(completeMatch[1])}”.`, toolCalls: calls };
  }

  const sendMatch = raw.match(/\bsend\s+(?:a\s+)?message\s+to\s+([^:]+):\s*(.+)$/i);
  if (sendMatch) {
    push("send_message", { thread: stripQuotes(sendMatch[1]), body: stripQuotes(sendMatch[2]) });
    return { content: `Sending that to ${stripQuotes(sendMatch[1])}.`, toolCalls: calls };
  }

  const postMatch = raw.match(/\b(?:post|schedule\s+(?:a\s+)?post)\s+(?:to|on)\s+(linkedin|x|instagram|facebook|tiktok|youtube)\b[:,]?\s*(.+)$/i);
  if (postMatch) {
    const platform = ({ x: "X", linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" } as Record<string, string>)[
      postMatch[1].toLowerCase()
    ];
    const caption = stripQuotes(postMatch[2]);
    push("schedule_social_post", {
      platform,
      caption,
      hashtags: caption.match(/#[\w]+/g)?.map((tag) => tag.slice(1)) ?? [],
      inHours: 24,
    });
    return { content: `Scheduling a ${platform} post for tomorrow.`, toolCalls: calls };
  }

  const auditMatch = raw.match(/\b(?:audit|seo)\s+(https?:\/\/\S+|\/\S+)/i) ?? raw.match(URL);
  if (auditMatch && /\b(audit|seo)\b/i.test(text)) {
    const url = auditMatch[1] ?? auditMatch[0];
    push("run_seo_audit", {
      url,
      title: `${titleCase(url.replace(/^https?:\/\//, "").split("/").filter(Boolean).slice(0, 2).join(" "))} — page title`,
      description: "Replace with the live meta description before publishing this audit.",
      keywords: [],
      body: "",
    });
    return { content: `Auditing ${url}.`, toolCalls: calls };
  }

  if (/\b(list|show)\b.*\b(unread\s+)?(threads|inbox|messages)\b/.test(text)) {
    push("list_threads", { unreadOnly: /unread/.test(text) });
    return { content: "Listing threads.", toolCalls: calls };
  }
  if (/\b(list|show)\b.*\btasks?\b/.test(text)) {
    push("list_tasks", { openOnly: !/all/.test(text) });
    return { content: "Listing tasks.", toolCalls: calls };
  }
  if (/\b(list|show)\b.*\b(contacts?|people)\b/.test(text)) {
    push("list_contacts", { limit: 25 });
    return { content: "Listing contacts.", toolCalls: calls };
  }
  if (/\b(list|show)\b.*\bdeals?\b/.test(text)) {
    push("list_deals", { limit: 25 });
    return { content: "Listing deals.", toolCalls: calls };
  }
  if (/\b(list|show)\b.*\bstudents?\b/.test(text)) {
    push("list_students", {});
    return { content: "Listing students.", toolCalls: calls };
  }
  if (/\b(pipeline|forecast|weighted)\b/.test(text)) {
    push("pipeline_forecast", {});
    return { content: "Reading the pipeline.", toolCalls: calls };
  }
  if (/\b(status|snapshot|overview|summary|how are we|what.s happening)\b/.test(text)) {
    push("workspace_snapshot", {});
    return { content: "Taking a snapshot of the workspace.", toolCalls: calls };
  }


  /* ---------- newer surfaces: education, community, studios, ops ---------- */

  const studentMatch = raw.match(/^(?:add|create|new|enrol|enroll)\s+student[:\s]+(.+)$/i);
  if (studentMatch) {
    const rest = stripQuotes(studentMatch[1]);
    const email = rest.match(EMAIL)?.[0] ?? "";
    const name = titleCase(
      rest
        .replace(EMAIL, "")
        .replace(/\b(?:at|from)\s+.*$/i, "")
        .replace(/[,;]+\s*$/, "")
        .trim(),
    );
    if (!email || !name) {
      return {
        content: "Give me a name and an email, e.g. “add student Amara Okoye amara@example.com”.",
        toolCalls: [],
      };
    }
    push("create_student", { name, email });
    return { content: `Adding ${name} to the education pipeline.`, toolCalls: calls };
  }

  const eventMatch = raw.match(
    /^(?:schedule|create|add|book)\s+(?:an?\s+)?(webinar|event|meeting|deadline|launch|community)[:\s]+(.+)$/i,
  );
  if (eventMatch) {
    const type = eventMatch[1].toLowerCase();
    const title = stripQuotes(eventMatch[2]);
    push("create_event", {
      title,
      type:
        type === "webinar"
          ? "webinar"
          : type === "deadline"
            ? "deadline"
            : type === "launch"
              ? "launch"
              : type === "community"
                ? "community"
                : "meeting",
    });
    return { content: `Scheduling the ${type} “${title}”.`, toolCalls: calls };
  }

  const feedMatch = raw.match(/^(?:post|publish|announce)\s+(?:to\s+(?:the\s+)?(?:feed|community))?[:\s]+(.+)$/i);
  if (feedMatch && !/linkedin|x\b|twitter|instagram/i.test(raw)) {
    push("create_post", { body: stripQuotes(feedMatch[1]) });
    return { content: "Posting that to the community feed.", toolCalls: calls };
  }

  const gatewayMatch = raw.match(/^(connect|disconnect|enable|disable|toggle)\s+(?:the\s+)?gateway[:\s]+(.+)$/i);
  if (gatewayMatch) {
    const off = /dis|disable/i.test(gatewayMatch[1]);
    push("update_gateway", { query: stripQuotes(gatewayMatch[2]), connected: !off });
    return { content: `${off ? "Disconnecting" : "Connecting"} that gateway.`, toolCalls: calls };
  }

  if (/\bkid[- ]?safe\b/.test(text)) {
    const on = !/\b(off|disable|stop)\b/.test(text);
    push("set_kid_safe", { on });
    return { content: `Turning kid-safe mode ${on ? "on" : "off"}.`, toolCalls: calls };
  }

  if (/\b(notifications?|bell|badge)\b/.test(text) && /\b(mark|clear|read|dismiss)/.test(text)) {
    push("mark_notifications_read", {});
    return { content: "Clearing unread notifications.", toolCalls: calls };
  }

  const diagramMatch = raw.match(/^(?:create|draw|save|make)\s+(?:a\s+)?diagram[:\s]+(.+)$/i);
  if (diagramMatch) {
    const body = stripQuotes(diagramMatch[1]);
    const [name, stepsRaw] = body.split(/[:—]>?|\bfrom\b/i);
    const steps = (stepsRaw ?? "")
      .split(/\s*(?:,|->|→|then)\s*/i)
      .map((step) => stripQuotes(step))
      .filter(Boolean);
    push("save_diagram", { name: titleCase(name ?? "Flow"), steps });
    return { content: `Drawing “${titleCase(name ?? "Flow")}”.`, toolCalls: calls };
  }

  const wikiMatch = raw.match(/^(?:wiki|document)\s+(?:page\s+)?[:“"]?(.+?)[”"]?(?::\s*(.+))?$/i);
  if (wikiMatch && /^wiki\b/i.test(text)) {
    push("create_wiki_page", {
      title: titleCase(stripQuotes(wikiMatch[1])),
      summary: stripQuotes(wikiMatch[2] ?? "Written by Bill Agent."),
    });
    return { content: "Writing that wiki page.", toolCalls: calls };
  }

  push("search_workspace", { query: raw, limit: 3 });
  return {
    content: `I do not have a rule for that phrasing, so I am searching the workspace for “${raw}”. Say “help” for the grammar.`,
    toolCalls: calls,
  };
}

/* ------------------------------------------------------------------ */
/* Responding                                                          */
/* ------------------------------------------------------------------ */

export function summarizeToolTurns(turns: ChatTurn[]): string {
  const toolTurns = turns.filter((turn) => turn.role === "tool");
  if (toolTurns.length === 0) return "";
  if (toolTurns.length === 1) {
    const [summary] = toolTurns[0].content.split("\n");
    return `Done. ${summary}`;
  }
  return [
    `Done — ${toolTurns.length} steps:`,
    ...toolTurns.map((turn) => `• ${turn.name ?? "tool"}: ${turn.content.split("\n")[0]}`),
  ].join("\n");
}

export function offlineDecide(turns: ChatTurn[]): Decision {
  const lastUserIndex = [...turns].reverse().findIndex((turn) => turn.role === "user");
  if (lastUserIndex === -1) {
    return { content: "Give me a task and I will act on the workspace.", toolCalls: [] };
  }
  const userIndex = turns.length - 1 - lastUserIndex;
  const after = turns.slice(userIndex + 1);
  const toolTurns = after.filter((turn) => turn.role === "tool");
  if (toolTurns.length > 0) {
    return { content: summarizeToolTurns(turns), toolCalls: [] };
  }
  return planOffline(turns[userIndex].content);
}
