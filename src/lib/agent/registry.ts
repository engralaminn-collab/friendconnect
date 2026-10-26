/* ============================================================
   Bill Agent — tool registry
   ------------------------------------------------------------
   Every button in the workspace, expressed as a tool a model can
   call. The registry is the single source of truth for:
     · the manifest served at /api/agent/manifest
     · the tool catalogue UI
     · the argument schemas handed to the model
     · the offline planner's vocabulary
   Tools never import the store; they receive a WorkspacePort.
   ============================================================ */

import { slugify, uid } from "@/lib/utils";
import { EXAM_PAPERS, getPaper } from "@/lib/data/exams";
import {
  emptyAttempt,
  formatBand,
  gradeAttempt,
  objectiveCount,
  paperMinutes,
  type ExamAnswer,
} from "@/lib/exam";
import type {
  Contact,
  Deal,
  Lead,
  Stage,
  Student,
  Thread,
} from "@/lib/types";
import type {
  ToolContext,
  ToolDefinition,
  ToolResult,
  WorkspacePort,
} from "./types";

const STAGES: Stage[] = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();

function matches(haystack: Array<string | undefined>, needle: string) {
  const q = norm(needle);
  if (!q) return false;
  return haystack.some((value) => norm(value).includes(q));
}

function findContact(ws: WorkspacePort, query: string): Contact | undefined {
  const q = norm(query);
  return (
    ws.contacts.find((c) => c.id === query) ??
    ws.contacts.find((c) => norm(c.email) === q) ??
    ws.contacts.find((c) => norm(c.name) === q) ??
    ws.contacts.find((c) => matches([c.name, c.email, c.company, c.phone], query))
  );
}

function findDeal(ws: WorkspacePort, query: string): Deal | undefined {
  return (
    ws.deals.find((d) => d.id === query) ??
    ws.deals.find((d) => norm(d.title) === norm(query)) ??
    ws.deals.find((d) => matches([d.title, d.id], query))
  );
}

function findLead(ws: WorkspacePort, query: string): Lead | undefined {
  return (
    ws.leads.find((l) => l.id === query) ??
    ws.leads.find((l) => norm(l.email) === norm(query)) ??
    ws.leads.find((l) => matches([l.name, l.email, l.company], query))
  );
}

function findStudent(ws: WorkspacePort, query: string): Student | undefined {
  return (
    ws.students.find((s) => s.id === query) ??
    ws.students.find((s) => norm(s.email) === norm(query)) ??
    ws.students.find((s) => matches([s.name, s.email, s.country], query))
  );
}

function findThread(ws: WorkspacePort, query: string): Thread | undefined {
  return (
    ws.threads.find((t) => t.id === query) ??
    ws.threads.find((t) => norm(t.contactName) === norm(query)) ??
    ws.threads.find((t) => matches([t.contactName, t.phone, t.email, t.id], query))
  );
}

const iso = (ctx: ToolContext) => ctx.now().toISOString();
const day = (ctx: ToolContext, offset: number) =>
  new Date(ctx.now().getTime() + offset * 86_400_000).toISOString();

function fail(message: string): ToolResult {
  return { ok: false, summary: message };
}

function readTool(
  base: Omit<ToolDefinition, "risk" | "requiresApproval">,
): ToolDefinition {
  return { ...base, risk: "read", requiresApproval: false };
}

function writeTool(
  base: Omit<ToolDefinition, "risk" | "requiresApproval">,
): ToolDefinition {
  return { ...base, risk: "write", requiresApproval: false };
}

/* ------------------------------------------------------------------ */
/* CRM                                                                 */
/* ------------------------------------------------------------------ */

const crmTools: ToolDefinition[] = [
  readTool({
    name: "list_contacts",
    title: "List contacts",
    group: "crm",
    description:
      "List CRM contacts, optionally filtered by free-text query or pipeline stage. Returns id, name, email, stage and value.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text filter over name, email and company." },
        stage: { type: "string", description: "Pipeline stage filter.", enum: STAGES },
        limit: { type: "number", description: "Maximum rows to return (default 25).", default: 25 },
      },
      required: [],
      additionalProperties: false,
    },
    examples: [{ args: { stage: "proposal", limit: 5 }, note: "Open proposals only" }],
    run: (ctx, args) => {
      const query = String(args.query ?? "");
      const stage = args.stage as Stage | undefined;
      const limit = Number(args.limit ?? 25);
      const rows = ctx.workspace.contacts.filter((c) => {
        if (stage && c.stage !== stage) return false;
        if (query && !matches([c.name, c.email, c.company, c.title], query)) return false;
        return true;
      });
      const page = rows.slice(0, Math.max(1, limit));
      return {
        ok: true,
        summary: `${page.length} of ${rows.length} contact(s)${stage ? ` in ${stage}` : ""}.`,
        data: page.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          company: c.company,
          stage: c.stage,
          value: c.value,
        })),
      };
    },
  }),
  readTool({
    name: "get_contact",
    title: "Get one contact",
    group: "crm",
    description:
      "Look up a single contact by id, email, or name fragment and return the full record with their deals and recent activity.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Contact id, email or name fragment." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const contact = findContact(ctx.workspace, String(args.query));
      if (!contact) return fail(`No contact matched “${String(args.query)}”.`);
      const deals = ctx.workspace.deals.filter((d) => d.contactId === contact.id);
      const activity = ctx.workspace.activities.filter((a) => a.contactId === contact.id);
      return {
        ok: true,
        summary: `${contact.name} · ${contact.stage} · ${deals.length} deal(s) · ${activity.length} activity record(s).`,
        data: { contact, deals, activity },
      };
    },
  }),
  writeTool({
    name: "create_contact",
    title: "Create contact",
    group: "crm",
    description: "Create a CRM contact. Name and email are required; everything else is optional.",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name." },
        email: { type: "string", description: "Email address." },
        company: { type: "string", description: "Employer or organisation." },
        title: { type: "string", description: "Job title." },
        phone: { type: "string", description: "Phone number in E.164 where possible." },
        country: { type: "string", description: "Country." },
        stage: { type: "string", description: "Starting pipeline stage (default lead).", enum: STAGES, default: "lead" },
        value: { type: "number", description: "Potential value in GBP.", default: 0 },
        source: { type: "string", description: "Where the contact came from.", default: "Bill Agent" },
        tags: { type: "array", description: "Tags.", items: { type: "string" } },
        notes: { type: "string", description: "Free-form notes." },
      },
      required: ["name", "email"],
      additionalProperties: false,
    },
    examples: [
      { args: { name: "Jane Okafor", email: "jane@northwind.dev", company: "Northwind" }, note: "Minimum viable contact" },
    ],
    run: (ctx, args) => {
      const email = String(args.email);
      const duplicate = ctx.workspace.contacts.find((c) => norm(c.email) === norm(email));
      if (duplicate) {
        return fail(`${duplicate.name} already uses ${email} (${duplicate.id}).`);
      }
      const contact = ctx.workspace.addContact({
        name: String(args.name),
        email,
        phone: args.phone ? String(args.phone) : undefined,
        company: args.company ? String(args.company) : undefined,
        title: args.title ? String(args.title) : undefined,
        country: args.country ? String(args.country) : undefined,
        stage: (args.stage as Stage) ?? "lead",
        value: Number(args.value ?? 0),
        source: String(args.source ?? "Bill Agent"),
        tags: Array.isArray(args.tags) ? (args.tags as string[]) : [],
        notes: args.notes ? String(args.notes) : undefined,
        owner: "Bill Agent",
      });
      return {
        ok: true,
        summary: `Created ${contact.name} (${contact.email}) at stage ${contact.stage}.`,
        data: contact,
      };
    },
  }),
  writeTool({
    name: "update_contact",
    title: "Update contact",
    group: "crm",
    description:
      "Update fields on an existing contact (company, title, phone, notes, value). Use move_contact_stage for stage changes.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Contact id, email or name fragment." },
        company: { type: "string", description: "New company." },
        title: { type: "string", description: "New job title." },
        phone: { type: "string", description: "New phone number." },
        notes: { type: "string", description: "Replace the notes field." },
        value: { type: "number", description: "Potential value in GBP." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const contact = findContact(ctx.workspace, String(args.query));
      if (!contact) return fail(`No contact matched “${String(args.query)}”.`);
      const patch: Partial<Contact> = {};
      if (args.company !== undefined) patch.company = String(args.company);
      if (args.title !== undefined) patch.title = String(args.title);
      if (args.phone !== undefined) patch.phone = String(args.phone);
      if (args.notes !== undefined) patch.notes = String(args.notes);
      if (args.value !== undefined) patch.value = Number(args.value);
      if (Object.keys(patch).length === 0) return fail("No fields to update.");
      ctx.workspace.updateContact(contact.id, patch);
      return {
        ok: true,
        summary: `Updated ${contact.name}: ${Object.keys(patch).join(", ")}.`,
        data: { ...contact, ...patch },
      };
    },
  }),
  writeTool({
    name: "move_contact_stage",
    title: "Move contact stage",
    group: "crm",
    description: "Move a contact to another pipeline stage and log the change as an activity.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Contact id, email or name fragment." },
        stage: { type: "string", description: "Destination stage.", enum: STAGES },
      },
      required: ["query", "stage"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const contact = findContact(ctx.workspace, String(args.query));
      if (!contact) return fail(`No contact matched “${String(args.query)}”.`);
      const stage = args.stage as Stage;
      if (contact.stage === stage) return fail(`${contact.name} is already at ${stage}.`);
      ctx.workspace.moveContactStage(contact.id, stage);
      ctx.workspace.addActivity({
        type: "stage_change",
        title: `${contact.name}: ${contact.stage} → ${stage}`,
        detail: "Stage change requested by Bill Agent.",
        contactId: contact.id,
        done: true,
      });
      return { ok: true, summary: `${contact.name} moved ${contact.stage} → ${stage}.`, data: { id: contact.id, stage } };
    },
  }),
  writeTool({
    name: "star_contact",
    title: "Star or unstar contact",
    group: "crm",
    description: "Toggle or set the star flag on a contact.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Contact id, email or name fragment." },
        starred: { type: "boolean", description: "Force the value; omit to toggle." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const contact = findContact(ctx.workspace, String(args.query));
      if (!contact) return fail(`No contact matched “${String(args.query)}”.`);
      const desired = args.starred === undefined ? !contact.starred : Boolean(args.starred);
      if (Boolean(contact.starred) !== desired) ctx.workspace.toggleContactStar(contact.id);
      return { ok: true, summary: `${contact.name} ${desired ? "starred" : "unstarred"}.`, data: { id: contact.id, starred: desired } };
    },
  }),
  {
    name: "delete_contact",
    title: "Delete contact",
    group: "crm",
    description: "Permanently remove a contact. This cannot be undone.",
    risk: "destructive",
    requiresApproval: true,
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Contact id, email or name fragment." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const contact = findContact(ctx.workspace, String(args.query));
      if (!contact) return fail(`No contact matched “${String(args.query)}”.`);
      ctx.workspace.removeContact(contact.id);
      return { ok: true, summary: `Deleted ${contact.name} (${contact.id}).`, data: { id: contact.id } };
    },
  },
  readTool({
    name: "list_deals",
    title: "List deals",
    group: "crm",
    description: "List deals in the pipeline with value, probability and close date.",
    schema: {
      type: "object",
      properties: {
        stage: { type: "string", description: "Stage filter.", enum: STAGES },
        query: { type: "string", description: "Free-text filter over the deal title." },
        limit: { type: "number", description: "Maximum rows (default 25).", default: 25 },
      },
      required: [],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const stage = args.stage as Stage | undefined;
      const query = String(args.query ?? "");
      const rows = ctx.workspace.deals.filter((d) => {
        if (stage && d.stage !== stage) return false;
        if (query && !matches([d.title], query)) return false;
        return true;
      });
      return {
        ok: true,
        summary: `${rows.length} deal(s), total value ${rows.reduce((sum, d) => sum + d.value, 0).toLocaleString("en-GB")} GBP.`,
        data: rows.slice(0, Math.max(1, Number(args.limit ?? 25))),
      };
    },
  }),
  writeTool({
    name: "create_deal",
    title: "Create deal",
    group: "crm",
    description: "Add a deal to the pipeline, optionally linked to a contact by name.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Deal title." },
        value: { type: "number", description: "Deal value in GBP." },
        stage: { type: "string", description: "Stage (default proposal).", enum: STAGES, default: "proposal" },
        probability: { type: "number", description: "Win probability 0-100 (default derived from stage)." },
        closeDate: { type: "string", description: "ISO date for expected close." },
        contact: { type: "string", description: "Contact name, email or id to link." },
        notes: { type: "string", description: "Notes." },
        tags: { type: "array", description: "Tags.", items: { type: "string" } },
      },
      required: ["title", "value"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const stage = (args.stage as Stage) ?? "proposal";
      const contact = args.contact ? findContact(ctx.workspace, String(args.contact)) : undefined;
      const baseProbability: Record<Stage, number> = {
        lead: 10,
        qualified: 25,
        proposal: 45,
        negotiation: 65,
        won: 100,
        lost: 0,
      };
      const deal = ctx.workspace.addDeal({
        title: String(args.title),
        value: Number(args.value),
        stage,
        probability: Number(args.probability ?? baseProbability[stage]),
        closeDate: String(args.closeDate ?? day(ctx, 30)),
        contactId: contact?.id,
        notes: args.notes ? String(args.notes) : undefined,
        tags: Array.isArray(args.tags) ? (args.tags as string[]) : [],
      });
      return {
        ok: true,
        summary: `Created deal “${deal.title}” worth ${deal.value.toLocaleString("en-GB")} GBP${contact ? ` for ${contact.name}` : ""}.`,
        data: deal,
      };
    },
  }),
  writeTool({
    name: "move_deal",
    title: "Move deal",
    group: "crm",
    description: "Move a deal to another pipeline stage.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Deal id or title fragment." },
        stage: { type: "string", description: "Destination stage.", enum: STAGES },
      },
      required: ["query", "stage"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const deal = findDeal(ctx.workspace, String(args.query));
      if (!deal) return fail(`No deal matched “${String(args.query)}”.`);
      const stage = args.stage as Stage;
      ctx.workspace.moveDeal(deal.id, stage);
      return { ok: true, summary: `“${deal.title}” moved ${deal.stage} → ${stage}.`, data: { id: deal.id, stage } };
    },
  }),
  {
    name: "delete_deal",
    title: "Delete deal",
    group: "crm",
    description: "Permanently remove a deal from the pipeline.",
    risk: "destructive",
    requiresApproval: true,
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Deal id or title fragment." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const deal = findDeal(ctx.workspace, String(args.query));
      if (!deal) return fail(`No deal matched “${String(args.query)}”.`);
      ctx.workspace.removeDeal(deal.id);
      return { ok: true, summary: `Deleted deal “${deal.title}”.`, data: { id: deal.id } };
    },
  },
  readTool({
    name: "pipeline_forecast",
    title: "Pipeline forecast",
    group: "crm",
    description:
      "Compute open pipeline value, weighted forecast, win rate and per-stage breakdown from live deal data.",
    schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: (ctx) => {
      const deals = ctx.workspace.deals;
      const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
      const won = deals.filter((d) => d.stage === "won");
      const lost = deals.filter((d) => d.stage === "lost");
      const byStage = STAGES.map((stage) => {
        const rows = deals.filter((d) => d.stage === stage);
        return {
          stage,
          count: rows.length,
          value: rows.reduce((sum, d) => sum + d.value, 0),
        };
      });
      const weighted = open.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
      const winRate = won.length + lost.length === 0 ? 0 : (won.length / (won.length + lost.length)) * 100;
      return {
        ok: true,
        summary: `Open pipeline ${open.reduce((s, d) => s + d.value, 0).toLocaleString("en-GB")} GBP · weighted ${Math.round(weighted).toLocaleString("en-GB")} GBP · win rate ${winRate.toFixed(0)}%.`,
        data: {
          openDeals: open.length,
          openValue: open.reduce((s, d) => s + d.value, 0),
          weightedValue: Math.round(weighted),
          wonValue: won.reduce((s, d) => s + d.value, 0),
          winRate: Number(winRate.toFixed(1)),
          byStage,
        },
      };
    },
  }),
  writeTool({
    name: "create_company",
    title: "Create company",
    group: "crm",
    description: "Add a company account with firmographics.",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Company name." },
        domain: { type: "string", description: "Primary domain." },
        industry: { type: "string", description: "Industry." },
        size: { type: "string", description: "Size band, e.g. 11-50." },
        country: { type: "string", description: "Country." },
        employees: { type: "number", description: "Employee count." },
        revenue: { type: "number", description: "Annual revenue." },
        description: { type: "string", description: "Short description." },
      },
      required: ["name"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const company = ctx.workspace.addCompany({
        name: String(args.name),
        domain: args.domain ? String(args.domain) : undefined,
        industry: args.industry ? String(args.industry) : undefined,
        size: args.size ? String(args.size) : undefined,
        country: args.country ? String(args.country) : undefined,
        employees: args.employees !== undefined ? Number(args.employees) : undefined,
        revenue: args.revenue !== undefined ? Number(args.revenue) : undefined,
        description: args.description ? String(args.description) : undefined,
      });
      return { ok: true, summary: `Created company ${company.name}.`, data: company };
    },
  }),
  writeTool({
    name: "qualify_lead",
    title: "Qualify lead",
    group: "crm",
    description: "Set a lead's status and/or score.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Lead name, email or id." },
        status: {
          type: "string",
          description: "Lead status.",
          enum: ["new", "enriched", "qualified", "contacted", "converted", "lost"],
        },
        score: { type: "number", description: "Score 0-100." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const lead = findLead(ctx.workspace, String(args.query));
      if (!lead) return fail(`No lead matched “${String(args.query)}”.`);
      const patch: Partial<Lead> = {};
      if (args.status) patch.status = args.status as Lead["status"];
      if (args.score !== undefined) patch.score = Math.max(0, Math.min(100, Number(args.score)));
      if (Object.keys(patch).length === 0) return fail("Provide status and/or score.");
      ctx.workspace.updateLead(lead.id, patch);
      return { ok: true, summary: `Lead ${lead.name} updated (${Object.keys(patch).join(", ")}).`, data: { ...lead, ...patch } };
    },
  }),
  writeTool({
    name: "log_activity",
    title: "Log activity",
    group: "crm",
    description: "Record a call, email, meeting, note or task against a contact.",
    schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Activity type.",
          enum: ["call", "email", "meeting", "note", "task", "stage_change"],
        },
        title: { type: "string", description: "One-line summary." },
        detail: { type: "string", description: "Longer detail." },
        contact: { type: "string", description: "Contact name, email or id." },
        due: { type: "string", description: "ISO due date for follow-ups." },
        done: { type: "boolean", description: "Already completed?", default: true },
      },
      required: ["type", "title"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const contact = args.contact ? findContact(ctx.workspace, String(args.contact)) : undefined;
      ctx.workspace.addActivity({
        type: args.type as "call" | "email" | "meeting" | "note" | "task" | "stage_change",
        title: String(args.title),
        detail: args.detail ? String(args.detail) : undefined,
        contactId: contact?.id,
        due: args.due ? String(args.due) : undefined,
        done: args.done === undefined ? true : Boolean(args.done),
      });
      return {
        ok: true,
        summary: `Logged ${String(args.type)} “${String(args.title)}”${contact ? ` for ${contact.name}` : ""}.`,
      };
    },
  }),
  writeTool({
    name: "create_task",
    title: "Create task",
    group: "crm",
    description: "Add a task to the workspace task list.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title." },
        priority: { type: "string", description: "Priority.", enum: ["low", "medium", "high"], default: "medium" },
        module: { type: "string", description: "Owning module label.", default: "Operations" },
      },
      required: ["title"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      ctx.workspace.addTask({
        title: String(args.title),
        priority: (args.priority as "low" | "medium" | "high") ?? "medium",
        module: String(args.module ?? "Operations"),
      });
      return { ok: true, summary: `Task created: ${String(args.title)}.` };
    },
  }),
  writeTool({
    name: "complete_task",
    title: "Complete task",
    group: "crm",
    description: "Mark a task as done by title fragment.",
    schema: {
      type: "object",
      properties: { query: { type: "string", description: "Task title fragment." } },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const task = ctx.workspace.tasks.find((t) => matches([t.title], String(args.query)));
      if (!task) return fail(`No task matched “${String(args.query)}”.`);
      if (!task.done) ctx.workspace.toggleTask(task.id);
      return { ok: true, summary: `Completed “${task.title}”.`, data: { id: task.id } };
    },
  }),
  readTool({
    name: "list_tasks",
    title: "List tasks",
    group: "crm",
    description: "List workspace tasks with priority and due date.",
    schema: {
      type: "object",
      properties: {
        openOnly: { type: "boolean", description: "Hide completed tasks.", default: true },
      },
      required: [],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const openOnly = args.openOnly === undefined ? true : Boolean(args.openOnly);
      const rows = ctx.workspace.tasks.filter((t) => (openOnly ? !t.done : true));
      return {
        ok: true,
        summary: `${rows.length} ${openOnly ? "open" : ""} task(s).`,
        data: rows.map((t) => ({ id: t.id, title: t.title, priority: t.priority, due: t.due, done: t.done })),
      };
    },
  }),
];

/* ------------------------------------------------------------------ */
/* Education                                                           */
/* ------------------------------------------------------------------ */

const educationTools: ToolDefinition[] = [
  readTool({
    name: "list_students",
    title: "List students",
    group: "education",
    description: "List students with status, country and budget, optionally filtered.",
    schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Status filter.",
          enum: ["enquiry", "shortlisted", "applied", "offer", "visa", "enrolled", "lost"],
        },
        query: { type: "string", description: "Free-text filter." },
      },
      required: [],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const status = args.status as Student["status"] | undefined;
      const rows = ctx.workspace.students.filter((s) => {
        if (status && s.status !== status) return false;
        if (args.query && !matches([s.name, s.email, s.country], String(args.query))) return false;
        return true;
      });
      return {
        ok: true,
        summary: `${rows.length} student(s)${status ? ` at ${status}` : ""}.`,
        data: rows.map((s) => ({ id: s.id, name: s.name, status: s.status, country: s.country, budget: s.budget })),
      };
    },
  }),
  writeTool({
    name: "move_student_status",
    title: "Move student status",
    group: "education",
    description: "Advance or change a student's enrolment status.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Student name, email or id." },
        status: {
          type: "string",
          description: "New status.",
          enum: ["enquiry", "shortlisted", "applied", "offer", "visa", "enrolled", "lost"],
        },
      },
      required: ["query", "status"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const student = findStudent(ctx.workspace, String(args.query));
      if (!student) return fail(`No student matched “${String(args.query)}”.`);
      const status = args.status as Student["status"];
      ctx.workspace.updateStudent(student.id, { status });
      ctx.workspace.addActivity({
        type: "stage_change",
        title: `${student.name}: ${student.status} → ${status}`,
        contactId: undefined,
        done: true,
      });
      return { ok: true, summary: `${student.name} moved ${student.status} → ${status}.`, data: { id: student.id, status } };
    },
  }),
  writeTool({
    name: "update_application",
    title: "Update application",
    group: "education",
    description: "Update an application's status or progress percentage.",
    schema: {
      type: "object",
      properties: {
        applicationId: { type: "string", description: "Application id." },
        student: { type: "string", description: "Student name or email (alternative to applicationId)." },
        status: {
          type: "string",
          description: "Application status.",
          enum: ["drafting", "documents", "submitted", "interview", "offer", "rejected", "accepted"],
        },
        progress: { type: "number", description: "Progress 0-100." },
        notes: { type: "string", description: "Notes." },
      },
      required: [],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      let application = args.applicationId
        ? ctx.workspace.applications.find((a) => a.id === args.applicationId)
        : undefined;
      if (!application && args.student) {
        const student = findStudent(ctx.workspace, String(args.student));
        if (student) application = ctx.workspace.applications.find((a) => a.studentId === student.id);
      }
      if (!application) return fail("No application matched. Provide applicationId or a known student.");
      const patch: Record<string, unknown> = {};
      if (args.status) patch.status = args.status;
      if (args.progress !== undefined) patch.progress = Math.max(0, Math.min(100, Number(args.progress)));
      if (args.notes !== undefined) patch.notes = String(args.notes);
      if (Object.keys(patch).length === 0) return fail("Provide status, progress or notes.");
      ctx.workspace.updateApplication(application.id, patch);
      return {
        ok: true,
        summary: `Application ${application.id} updated (${Object.keys(patch).join(", ")}).`,
        data: { ...application, ...patch },
      };
    },
  }),
  writeTool({
    name: "complete_checklist_item",
    title: "Tick a checklist item",
    group: "education",
    description: "Toggle a document checklist row on an application.",
    schema: {
      type: "object",
      properties: {
        applicationId: { type: "string", description: "Application id." },
        item: { type: "string", description: "Checklist label fragment." },
      },
      required: ["applicationId", "item"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const application = ctx.workspace.applications.find((a) => a.id === args.applicationId);
      if (!application) return fail(`No application with id ${String(args.applicationId)}.`);
      const row = application.checklist.find((c) => matches([c.label], String(args.item)));
      if (!row) {
        return fail(
          `No checklist item matched. Available: ${application.checklist.map((c) => c.label).join(" · ")}.`,
        );
      }
      ctx.workspace.toggleChecklist(application.id, row.id);
      return { ok: true, summary: `“${row.label}” toggled on ${application.id}.`, data: { id: row.id, wasDone: row.done } };
    },
  }),
  writeTool({
    name: "log_study_session",
    title: "Log study session",
    group: "education",
    description: "Record a study session for the study planner.",
    schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Subject, e.g. IELTS Writing." },
        topic: { type: "string", description: "Topic." },
        minutes: { type: "number", description: "Minutes logged (default 25).", default: 25 },
        confidence: { type: "number", description: "Confidence 1-5 (default 3).", default: 3 },
        done: { type: "boolean", description: "Completed?", default: true },
      },
      required: ["subject"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const minutes = Number(args.minutes ?? 25);
      ctx.workspace.addStudySession({
        subject: String(args.subject),
        topic: String(args.topic ?? ""),
        plannedMinutes: minutes,
        loggedMinutes: minutes,
        date: iso(ctx),
        done: args.done === undefined ? true : Boolean(args.done),
        confidence: Math.max(1, Math.min(5, Number(args.confidence ?? 3))),
      });
      return { ok: true, summary: `Logged ${minutes} minutes of ${String(args.subject)}.` };
    },
  }),
];

/* ------------------------------------------------------------------ */
/* Marketing                                                           */
/* ------------------------------------------------------------------ */

function seoChecks(input: { url: string; title: string; description: string; keywords: string[]; body: string }) {
  const titleLen = input.title.length;
  const descLen = input.description.length;
  const hasKeyword = input.keywords.length > 0;
  const inTitle = input.keywords.some((k) => norm(input.title).includes(norm(k)));
  const inBody = input.keywords.some((k) => norm(input.body).includes(norm(k)));
  const https = input.url.startsWith("https://");
  const longEnough = input.body.split(/\s+/).filter(Boolean).length >= 120;
  return [
    { label: "Title 30–60 characters", pass: titleLen >= 30 && titleLen <= 60, detail: `${titleLen} characters` },
    { label: "Meta description 70–160 characters", pass: descLen >= 70 && descLen <= 160, detail: `${descLen} characters` },
    { label: "Primary keyword in title", pass: hasKeyword && inTitle, detail: inTitle ? "present" : "missing" },
    { label: "Primary keyword in body", pass: hasKeyword && inBody, detail: inBody ? "present" : "missing" },
    { label: "HTTPS URL", pass: https, detail: https ? "secure" : "not secure" },
    { label: "Body 120+ words", pass: longEnough, detail: `${input.body.split(/\s+/).filter(Boolean).length} words` },
    { label: "Keyword set declared", pass: hasKeyword, detail: `${input.keywords.length} keyword(s)` },
    { label: "URL slug is lower-case", pass: /^[^A-Z]*$/.test(input.url), detail: input.url },
  ];
}

const marketingTools: ToolDefinition[] = [
  writeTool({
    name: "create_article",
    title: "Create article",
    group: "marketing",
    description: "Create a content-studio article in idea, draft or review state.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Working title." },
        excerpt: { type: "string", description: "One-paragraph excerpt." },
        body: { type: "string", description: "Markdown body." },
        keywords: { type: "array", description: "Target keywords.", items: { type: "string" } },
        status: {
          type: "string",
          description: "Editorial status.",
          enum: ["idea", "draft", "review", "published"],
          default: "draft",
        },
        tone: { type: "string", description: "Tone of voice.", default: "practical" },
      },
      required: ["title"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const title = String(args.title);
      const body = String(args.body ?? "");
      const keywords = Array.isArray(args.keywords) ? (args.keywords as string[]) : [];
      const article = ctx.workspace.addArticle({
        title,
        slug: slugify(title),
        excerpt: String(args.excerpt ?? body.slice(0, 160)),
        body,
        status: (args.status as "idea" | "draft" | "review" | "published") ?? "draft",
        keywords,
        seoScore: 0,
        tone: String(args.tone ?? "practical"),
        publishedAt: args.status === "published" ? iso(ctx) : undefined,
      });
      return { ok: true, summary: `Created article “${article.title}” (${article.status}).`, data: article };
    },
  }),
  writeTool({
    name: "update_article_status",
    title: "Move article status",
    group: "marketing",
    description: "Move an article between idea, draft, review and published.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Article title fragment or id." },
        status: {
          type: "string",
          description: "New status.",
          enum: ["idea", "draft", "review", "published"],
        },
      },
      required: ["query", "status"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const article =
        ctx.workspace.articles.find((a) => a.id === args.query) ??
        ctx.workspace.articles.find((a) => matches([a.title, a.slug], String(args.query)));
      if (!article) return fail(`No article matched “${String(args.query)}”.`);
      const status = args.status as "idea" | "draft" | "review" | "published";
      ctx.workspace.updateArticle(article.id, {
        status,
        publishedAt: status === "published" ? iso(ctx) : article.publishedAt,
      });
      return { ok: true, summary: `“${article.title}” → ${status}.`, data: { id: article.id, status } };
    },
  }),
  writeTool({
    name: "create_campaign",
    title: "Create campaign",
    group: "marketing",
    description: "Draft a marketing campaign across email, social, ads, webinar or SMS.",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Campaign name." },
        channel: { type: "string", description: "Channel.", enum: ["email", "social", "ads", "webinar", "sms"] },
        audience: { type: "string", description: "Audience description.", default: "All contacts" },
        budget: { type: "number", description: "Budget in GBP.", default: 0 },
        subject: { type: "string", description: "Subject line (email only)." },
        body: { type: "string", description: "Body copy." },
        startInDays: { type: "number", description: "Start offset in days (default 1).", default: 1 },
        durationDays: { type: "number", description: "Length in days (default 14).", default: 14 },
      },
      required: ["name", "channel"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const campaign = ctx.workspace.addCampaign({
        name: String(args.name),
        channel: args.channel as "email" | "social" | "ads" | "webinar" | "sms",
        status: "draft",
        audience: String(args.audience ?? "All contacts"),
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        budget: Number(args.budget ?? 0),
        startDate: day(ctx, Number(args.startInDays ?? 1)),
        endDate: day(ctx, Number(args.startInDays ?? 1) + Number(args.durationDays ?? 14)),
        subject: args.subject ? String(args.subject) : undefined,
        body: args.body ? String(args.body) : undefined,
      });
      return { ok: true, summary: `Created ${campaign.channel} campaign “${campaign.name}”.`, data: campaign };
    },
  }),
  writeTool({
    name: "set_campaign_status",
    title: "Set campaign status",
    group: "marketing",
    description: "Move a campaign between draft, scheduled, running, paused and complete.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Campaign name fragment or id." },
        status: {
          type: "string",
          description: "New status.",
          enum: ["draft", "scheduled", "running", "paused", "complete"],
        },
      },
      required: ["query", "status"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const campaign =
        ctx.workspace.campaigns.find((c) => c.id === args.query) ??
        ctx.workspace.campaigns.find((c) => matches([c.name], String(args.query)));
      if (!campaign) return fail(`No campaign matched “${String(args.query)}”.`);
      const status = args.status as "draft" | "scheduled" | "running" | "paused" | "complete";
      ctx.workspace.updateCampaign(campaign.id, { status });
      return { ok: true, summary: `Campaign “${campaign.name}” → ${status}.`, data: { id: campaign.id, status } };
    },
  }),
  writeTool({
    name: "schedule_social_post",
    title: "Schedule social post",
    group: "marketing",
    description: "Schedule a post on LinkedIn, X, Instagram, Facebook, TikTok or YouTube.",
    schema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          description: "Network.",
          enum: ["LinkedIn", "X", "Instagram", "Facebook", "TikTok", "YouTube"],
        },
        caption: { type: "string", description: "Post copy." },
        hashtags: { type: "array", description: "Hashtags, without the #.", items: { type: "string" } },
        media: {
          type: "string",
          description: "Media kind.",
          enum: ["none", "carousel", "video", "image", "thread"],
          default: "none",
        },
        inHours: { type: "number", description: "Hours from now to publish (default 24).", default: 24 },
      },
      required: ["platform", "caption"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const hours = Number(args.inHours ?? 24);
      const hashtags = Array.isArray(args.hashtags) ? (args.hashtags as string[]) : [];
      const post = ctx.workspace.addSocialPost({
        platform: args.platform as "LinkedIn" | "X" | "Instagram" | "Facebook" | "TikTok" | "YouTube",
        caption: String(args.caption),
        hashtags: hashtags.map((tag) => tag.replace(/^#/, "")),
        scheduledFor: new Date(ctx.now().getTime() + hours * 3_600_000).toISOString(),
        status: "scheduled",
        media: (args.media as "none" | "carousel" | "video" | "image" | "thread") ?? "none",
      });
      return {
        ok: true,
        summary: `Scheduled a ${post.platform} post for ${new Date(post.scheduledFor).toUTCString()}.`,
        data: post,
      };
    },
  }),
  writeTool({
    name: "run_seo_audit",
    title: "Run SEO audit",
    group: "marketing",
    description:
      "Audit a page: title and description lengths, keyword placement, HTTPS, body length and slug casing. Returns a 0-100 score.",
    schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Page URL or path." },
        title: { type: "string", description: "Page title." },
        description: { type: "string", description: "Meta description." },
        keywords: { type: "array", description: "Target keywords.", items: { type: "string" } },
        body: { type: "string", description: "Page body text or markdown." },
      },
      required: ["url", "title"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const keywords = Array.isArray(args.keywords) ? (args.keywords as string[]) : [];
      const checks = seoChecks({
        url: String(args.url),
        title: String(args.title),
        description: String(args.description ?? ""),
        keywords,
        body: String(args.body ?? ""),
      });
      const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
      ctx.workspace.addSeoAudit({
        url: String(args.url),
        title: String(args.title),
        description: String(args.description ?? ""),
        score,
        keywords,
        checks,
      });
      const failing = checks.filter((c) => !c.pass).map((c) => c.label);
      return {
        ok: true,
        summary:
          score >= 80
            ? `Audit scored ${score}/100. ${failing.length} improvement(s) left.`
            : `Audit scored ${score}/100. Fix: ${failing.slice(0, 4).join("; ")}.`,
        data: { score, checks },
      };
    },
  }),
];

/* ------------------------------------------------------------------ */
/* Knowledge                                                           */
/* ------------------------------------------------------------------ */

const knowledgeTools: ToolDefinition[] = [
  writeTool({
    name: "create_note",
    title: "Create note",
    group: "knowledge",
    description: "Save a note to the workspace.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Note title." },
        content: { type: "string", description: "Markdown content." },
        tags: { type: "array", description: "Tags.", items: { type: "string" } },
        pinned: { type: "boolean", description: "Pin the note.", default: false },
      },
      required: ["title"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const note = ctx.workspace.saveNote({
        title: String(args.title),
        content: String(args.content ?? ""),
        tags: Array.isArray(args.tags) ? (args.tags as string[]) : [],
        pinned: Boolean(args.pinned ?? false),
        color: "brand",
      });
      return { ok: true, summary: `Saved note “${note.title}”.`, data: note };
    },
  }),
  readTool({
    name: "search_notes",
    title: "Search notes",
    group: "knowledge",
    description: "Full-text search across notes, returning the matching excerpts.",
    schema: {
      type: "object",
      properties: { query: { type: "string", description: "Search text." } },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const rows = ctx.workspace.notes.filter((n) =>
        matches([n.title, n.content, ...n.tags], String(args.query)),
      );
      return {
        ok: true,
        summary: `${rows.length} note(s) matched “${String(args.query)}”.`,
        data: rows.slice(0, 10).map((n) => ({ id: n.id, title: n.title, excerpt: n.content.slice(0, 240) })),
      };
    },
  }),
  writeTool({
    name: "create_wiki_page",
    title: "Create wiki page",
    group: "knowledge",
    description: "Create a canonical knowledge-base page.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Page title." },
        summary: { type: "string", description: "One-line summary." },
        body: { type: "string", description: "Markdown body." },
        category: { type: "string", description: "Category.", default: "General" },
        links: { type: "array", description: "Related page titles.", items: { type: "string" } },
      },
      required: ["title"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const page = ctx.workspace.addWikiPage({
        title: String(args.title),
        slug: slugify(String(args.title)),
        summary: String(args.summary ?? ""),
        body: String(args.body ?? ""),
        category: String(args.category ?? "General"),
        links: Array.isArray(args.links) ? (args.links as string[]) : [],
      });
      return { ok: true, summary: `Created wiki page “${page.title}”.`, data: page };
    },
  }),
  readTool({
    name: "search_workspace",
    title: "Search everything",
    group: "knowledge",
    description:
      "Search contacts, companies, deals, students, notes, wiki pages, articles and threads in one pass.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text." },
        limit: { type: "number", description: "Max hits per collection (default 5).", default: 5 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const query = String(args.query);
      const limit = Math.max(1, Number(args.limit ?? 5));
      const ws = ctx.workspace;
      const hits = {
        contacts: ws.contacts
          .filter((c) => matches([c.name, c.email, c.company], query))
          .slice(0, limit)
          .map((c) => ({ id: c.id, label: c.name, detail: c.email })),
        companies: ws.companies
          .filter((c) => matches([c.name, c.domain, c.industry], query))
          .slice(0, limit)
          .map((c) => ({ id: c.id, label: c.name, detail: c.industry })),
        deals: ws.deals
          .filter((d) => matches([d.title, d.notes], query))
          .slice(0, limit)
          .map((d) => ({ id: d.id, label: d.title, detail: d.stage })),
        students: ws.students
          .filter((s) => matches([s.name, s.email, s.country], query))
          .slice(0, limit)
          .map((s) => ({ id: s.id, label: s.name, detail: s.status })),
        notes: ws.notes
          .filter((n) => matches([n.title, n.content, ...n.tags], query))
          .slice(0, limit)
          .map((n) => ({ id: n.id, label: n.title, detail: n.tags.join(", ") })),
        wiki: ws.wikiPages
          .filter((p) => matches([p.title, p.summary, p.body, p.category], query))
          .slice(0, limit)
          .map((p) => ({ id: p.id, label: p.title, detail: p.category })),
        articles: ws.articles
          .filter((a) => matches([a.title, a.excerpt, ...a.keywords], query))
          .slice(0, limit)
          .map((a) => ({ id: a.id, label: a.title, detail: a.status })),
        threads: ws.threads
          .filter((t) => matches([t.contactName, t.about, t.phone], query))
          .slice(0, limit)
          .map((t) => ({ id: t.id, label: t.contactName, detail: `${t.unread} unread` })),
      };
      const total = Object.values(hits).reduce((sum, rows) => sum + rows.length, 0);
      return { ok: true, summary: `${total} hit(s) for “${query}”.`, data: hits };
    },
  }),
  readTool({
    name: "workspace_snapshot",
    title: "Workspace snapshot",
    group: "operations",
    description:
      "One read of everything that matters right now: pipeline, tasks, unread messages, calls, students and content counts.",
    schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: (ctx) => {
      const ws = ctx.workspace;
      const openTasks = ws.tasks.filter((t) => !t.done);
      const unread = ws.threads.reduce((sum, t) => sum + t.unread, 0);
      const openDeals = ws.deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
      const snapshot = {
        contacts: ws.contacts.length,
        companies: ws.companies.length,
        deals: ws.deals.length,
        openDeals: openDeals.length,
        openPipeline: openDeals.reduce((sum, d) => sum + d.value, 0),
        leadsNew: ws.leads.filter((l) => l.status === "new").length,
        tasksOpen: openTasks.length,
        students: ws.students.length,
        applications: ws.applications.length,
        articles: ws.articles.length,
        campaigns: ws.campaigns.length,
        scheduledPosts: ws.socialPosts.filter((p) => p.status === "scheduled").length,
        notes: ws.notes.length,
        wikiPages: ws.wikiPages.length,
        unreadMessages: unread,
        calls: ws.calls.length,
        events: ws.events.length,
      };
      return {
        ok: true,
        summary: `${snapshot.contacts} contacts · ${snapshot.openDeals} open deals · ${snapshot.openPipeline.toLocaleString("en-GB")} GBP pipeline · ${snapshot.tasksOpen} open tasks · ${unread} unread messages.`,
        data: snapshot,
      };
    },
  }),
];

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

const messagingTools: ToolDefinition[] = [
  readTool({
    name: "list_threads",
    title: "List threads",
    group: "messaging",
    description: "List inbox threads with channel, unread count and the last message.",
    schema: {
      type: "object",
      properties: {
        unreadOnly: { type: "boolean", description: "Only threads with unread messages.", default: false },
        channel: { type: "string", description: "Channel filter.", enum: ["sms", "whatsapp", "voip", "email"] },
      },
      required: [],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const rows = ctx.workspace.threads.filter((t) => {
        if (args.unreadOnly && t.unread === 0) return false;
        if (args.channel && t.channel !== args.channel) return false;
        return true;
      });
      return {
        ok: true,
        summary: `${rows.length} thread(s).`,
        data: rows.map((t) => ({
          id: t.id,
          contact: t.contactName,
          channel: t.channel,
          unread: t.unread,
          last: t.messages[t.messages.length - 1]?.body?.slice(0, 120) ?? "",
        })),
      };
    },
  }),
  writeTool({
    name: "send_message",
    title: "Send message",
    group: "messaging",
    description: "Send a message into an existing thread.",
    schema: {
      type: "object",
      properties: {
        thread: { type: "string", description: "Thread id or contact name." },
        body: { type: "string", description: "Message body." },
      },
      required: ["thread", "body"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const thread = findThread(ctx.workspace, String(args.thread));
      if (!thread) return fail(`No thread matched “${String(args.thread)}”.`);
      ctx.workspace.sendMessage(thread.id, String(args.body));
      return { ok: true, summary: `Message sent to ${thread.contactName} on ${thread.channel}.`, data: { threadId: thread.id } };
    },
  }),
  writeTool({
    name: "start_thread",
    title: "Start thread",
    group: "messaging",
    description: "Open a new conversation with someone and optionally send the first message.",
    schema: {
      type: "object",
      properties: {
        contactName: { type: "string", description: "Person or business name." },
        channel: { type: "string", description: "Channel.", enum: ["sms", "whatsapp", "voip", "email"], default: "sms" },
        phone: { type: "string", description: "Phone number." },
        email: { type: "string", description: "Email address." },
        message: { type: "string", description: "First message." },
      },
      required: ["contactName"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const thread = ctx.workspace.createThread({
        channel: (args.channel as "sms" | "whatsapp" | "voip" | "email") ?? "sms",
        contactName: String(args.contactName),
        status: "open",
        phone: args.phone ? String(args.phone) : undefined,
        email: args.email ? String(args.email) : undefined,
        about: "Opened by Bill Agent",
      });
      if (args.message) ctx.workspace.sendMessage(thread.id, String(args.message));
      return {
        ok: true,
        summary: `Thread opened with ${thread.contactName} on ${thread.channel}${args.message ? " and first message sent" : ""}.`,
        data: { id: thread.id },
      };
    },
  }),
  writeTool({
    name: "mark_thread_read",
    title: "Mark thread read",
    group: "messaging",
    description: "Clear the unread counter on a thread.",
    schema: {
      type: "object",
      properties: { thread: { type: "string", description: "Thread id or contact name." } },
      required: ["thread"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const thread = findThread(ctx.workspace, String(args.thread));
      if (!thread) return fail(`No thread matched “${String(args.thread)}”.`);
      ctx.workspace.markThreadRead(thread.id);
      return { ok: true, summary: `${thread.contactName}'s thread marked read.`, data: { id: thread.id } };
    },
  }),
  readTool({
    name: "draft_outreach_email",
    title: "Draft outreach email",
    group: "messaging",
    description:
      "Compose a short, personal outreach email for a contact using their record. Deterministic: no network call, no invented facts beyond the CRM record.",
    schema: {
      type: "object",
      properties: {
        contact: { type: "string", description: "Contact name, email or id." },
        goal: { type: "string", description: "What the email should achieve." },
        tone: { type: "string", description: "Tone.", enum: ["warm", "direct", "formal"], default: "warm" },
      },
      required: ["contact"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const contact = findContact(ctx.workspace, String(args.contact));
      if (!contact) return fail(`No contact matched “${String(args.contact)}”.`);
      const goal = String(args.goal ?? "book a short call");
      const tone = String(args.tone ?? "warm");
      const openers: Record<string, string> = {
        warm: `I hope your week is going well.`,
        direct: `I will keep this short.`,
        formal: `I am writing regarding your current priorities.`,
      };
      const subject =
        tone === "formal"
          ? `Regarding ${contact.company ?? "your team"} — ${goal}`
          : `${contact.name.split(" ")[0]}, quick question about ${contact.company ?? "your work"}`;
      const body = [
        `Hi ${contact.name.split(" ")[0]},`,
        "",
        openers[tone] ?? openers.warm,
        `I am reaching out because ${goal}. ${contact.company ? `At ${contact.company}` : "In your role"}${contact.title ? `, as ${contact.title},` : ""} you are close to this problem, so your view would be worth more than mine.`,
        "",
        "Would a 15-minute call this week or next be useful? I will send an agenda first so you can decide before you commit the time.",
        "",
        "Best,",
        "Bill",
      ].join("\n");
      return {
        ok: true,
        summary: `Drafted a ${tone} email to ${contact.email}.`,
        data: { to: contact.email, subject, body, goal },
      };
    },
  }),
];


/* ------------------------------------------------------------------ */
/* Community, studios and operations                                   */
/* ------------------------------------------------------------------ */

const communityTools: ToolDefinition[] = [
  writeTool({
    name: "create_student",
    title: "Create student",
    group: "education",
    description: "Add a student record to the education pipeline.",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Student name." },
        email: { type: "string", description: "Email address." },
        country: { type: "string", description: "Country of residence.", default: "Unknown" },
        level: { type: "string", description: "Current study level.", default: "Undergraduate" },
        status: {
          type: "string",
          description: "Pipeline status.",
          enum: ["enquiry", "shortlisted", "applied", "offer", "visa", "enrolled", "lost"],
          default: "enquiry",
        },
        budget: { type: "number", description: "Annual budget in GBP.", default: 0 },
      },
      required: ["name", "email"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const email = String(args.email);
      const duplicate = ctx.workspace.students.find((s) => norm(s.email) === norm(email));
      if (duplicate) return fail(`${duplicate.name} already uses ${email}.`);
      const student = ctx.workspace.addStudent({
        name: String(args.name),
        email,
        country: String(args.country ?? "Unknown"),
        level: String(args.level ?? "Undergraduate"),
        status: (args.status as Student["status"]) ?? "enquiry",
        budget: Number(args.budget ?? 0),
      });
      return { ok: true, summary: `Created student ${student.name} at ${student.status}.`, data: student };
    },
  }),
  writeTool({
    name: "create_post",
    title: "Post to the community feed",
    group: "operations",
    description: "Publish a post to the community feed.",
    schema: {
      type: "object",
      properties: {
        body: { type: "string", description: "Post body." },
        topic: { type: "string", description: "Topic label.", default: "General" },
        tags: { type: "array", description: "Tags.", items: { type: "string" } },
      },
      required: ["body"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const post = ctx.workspace.addPost({
        author: "Bill Agent",
        authorRole: "Workspace operator",
        avatarHue: 24,
        body: String(args.body),
        topic: String(args.topic ?? "General"),
        tags: Array.isArray(args.tags) ? (args.tags as string[]) : [],
      });
      return { ok: true, summary: `Posted to the feed under ${post.topic}.`, data: post };
    },
  }),
  writeTool({
    name: "create_event",
    title: "Create event",
    group: "operations",
    description: "Add a webinar, deadline, meeting, launch or community event to the calendar.",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title." },
        type: {
          type: "string",
          description: "Event type.",
          enum: ["webinar", "deadline", "meeting", "launch", "community"],
          default: "meeting",
        },
        date: { type: "string", description: "ISO date. Defaults to seven days from now." },
        time: { type: "string", description: "Local time, e.g. 14:00." },
        description: { type: "string", description: "Description." },
        attendees: { type: "number", description: "Expected attendees.", default: 0 },
        location: { type: "string", description: "Location or meeting link." },
      },
      required: ["title"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const event = ctx.workspace.addEvent({
        title: String(args.title),
        type: (args.type as "webinar" | "deadline" | "meeting" | "launch" | "community") ?? "meeting",
        date: String(args.date ?? day(ctx, 7)),
        time: args.time ? String(args.time) : undefined,
        description: String(args.description ?? ""),
        attendees: Number(args.attendees ?? 0),
        location: args.location ? String(args.location) : undefined,
      });
      return { ok: true, summary: `Created ${event.type} “${event.title}”.`, data: event };
    },
  }),
  writeTool({
    name: "log_call",
    title: "Log a call",
    group: "messaging",
    description: "Record a completed or missed audio/video call in the call history.",
    schema: {
      type: "object",
      properties: {
        contactName: { type: "string", description: "Who the call was with." },
        direction: { type: "string", description: "Direction.", enum: ["incoming", "outgoing", "missed"] },
        kind: { type: "string", description: "Media kind.", enum: ["audio", "video"], default: "audio" },
        durationSec: { type: "number", description: "Duration in seconds.", default: 0 },
        status: {
          type: "string",
          description: "Outcome.",
          enum: ["completed", "missed", "declined", "failed"],
          default: "completed",
        },
        mos: { type: "number", description: "Mean opinion score 1-5 (default 4.2).", default: 4.2 },
        recording: { type: "boolean", description: "Was the call recorded?", default: false },
      },
      required: ["contactName", "direction"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const durationSec = Number(args.durationSec ?? 0);
      const mos = Math.max(1, Math.min(5, Number(args.mos ?? 4.2)));
      const call = ctx.workspace.addCall({
        contactName: String(args.contactName),
        direction: args.direction as "incoming" | "outgoing" | "missed",
        kind: (args.kind as "audio" | "video") ?? "audio",
        startedAt: iso(ctx),
        durationSec,
        status: (args.status as "completed" | "missed" | "declined" | "failed") ?? "completed",
        quality: {
          rttMs: Math.round((5 - mos) * 60),
          jitterMs: Math.round((5 - mos) * 8),
          lossPct: Number(((5 - mos) * 0.6).toFixed(2)),
          bitrateKbps: durationSec > 0 ? 640 : 0,
          mos,
          codec: "opus/48kHz",
        },
        recording: Boolean(args.recording ?? false),
      });
      return {
        ok: true,
        summary: `Logged ${call.direction} ${call.kind} call with ${call.contactName} (${call.durationSec}s, MOS ${mos}).`,
        data: call,
      };
    },
  }),
  writeTool({
    name: "update_gateway",
    title: "Update gateway",
    group: "operations",
    description: "Connect, disconnect or re-point a gateway (HTTP SMS, Domovina, ComfyUI, SIP, webhook).",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Gateway name or id." },
        connected: { type: "boolean", description: "Force the connection state; omit to toggle." },
        baseUrl: { type: "string", description: "New base URL." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const gateway =
        ctx.workspace.gateways.find((g) => g.id === args.query) ??
        ctx.workspace.gateways.find((g) => matches([g.name, g.provider], String(args.query)));
      if (!gateway) {
        return fail(
          `No gateway matched. Available: ${ctx.workspace.gateways.map((g) => g.name).join(" · ")}.`,
        );
      }
      const patch: Record<string, unknown> = {};
      if (args.baseUrl !== undefined) patch.baseUrl = String(args.baseUrl);
      if (Object.keys(patch).length > 0) {
        ctx.workspace.updateGateway(gateway.id, patch as never);
      }
      const desired =
        args.connected === undefined ? !gateway.connected : Boolean(args.connected);
      if (desired !== gateway.connected) ctx.workspace.toggleGateway(gateway.id);
      return {
        ok: true,
        summary: `${gateway.name} is now ${desired ? "connected" : "disconnected"}${
          args.baseUrl ? ` at ${String(args.baseUrl)}` : ""
        }.`,
        data: { id: gateway.id, connected: desired },
      };
    },
  }),
  writeTool({
    name: "toggle_plugin",
    title: "Enable or disable a plugin",
    group: "knowledge",
    description: "Install or remove a workspace plugin.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Plugin name or slug." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const plugin =
        ctx.workspace.plugins.find((p) => p.id === args.query) ??
        ctx.workspace.plugins.find((p) => matches([p.name, p.slug], String(args.query)));
      if (!plugin) {
        return fail(`No plugin matched. Available: ${ctx.workspace.plugins.map((p) => p.name).join(" · ")}.`);
      }
      ctx.workspace.togglePlugin(plugin.id);
      return {
        ok: true,
        summary: `${plugin.name} ${plugin.installed ? "disabled" : "enabled"}.`,
        data: { id: plugin.id, installed: !plugin.installed },
      };
    },
  }),
  writeTool({
    name: "pin_note",
    title: "Pin or unpin a note",
    group: "knowledge",
    description: "Pin a note to the top of the notes list.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Note title fragment." },
        pinned: { type: "boolean", description: "Force the value; omit to toggle." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const note = ctx.workspace.notes.find((n) => matches([n.title], String(args.query)));
      if (!note) return fail(`No note matched “${String(args.query)}”.`);
      const desired = args.pinned === undefined ? !note.pinned : Boolean(args.pinned);
      if (desired !== note.pinned) ctx.workspace.toggleNotePin(note.id);
      return { ok: true, summary: `“${note.title}” ${desired ? "pinned" : "unpinned"}.`, data: { id: note.id } };
    },
  }),
  writeTool({
    name: "update_wiki_page",
    title: "Update wiki page",
    group: "knowledge",
    description: "Rewrite the summary, body or category of an existing wiki page.",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Page title or slug." },
        summary: { type: "string", description: "New one-line summary." },
        body: { type: "string", description: "New markdown body." },
        category: { type: "string", description: "New category." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const page =
        ctx.workspace.wikiPages.find((p) => p.id === args.query) ??
        ctx.workspace.wikiPages.find((p) => matches([p.title, p.slug], String(args.query)));
      if (!page) return fail(`No wiki page matched “${String(args.query)}”.`);
      const patch: Record<string, unknown> = {};
      if (args.summary !== undefined) patch.summary = String(args.summary);
      if (args.body !== undefined) patch.body = String(args.body);
      if (args.category !== undefined) patch.category = String(args.category);
      if (Object.keys(patch).length === 0) return fail("Provide summary, body or category.");
      ctx.workspace.updateWikiPage(page.id, patch as never);
      return { ok: true, summary: `Updated wiki page “${page.title}”.`, data: { id: page.id } };
    },
  }),
  writeTool({
    name: "save_diagram",
    title: "Save diagram",
    group: "studios",
    description:
      "Create a flow diagram from a list of step labels. Nodes are laid out left to right with start and end caps.",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Diagram name." },
        description: { type: "string", description: "What the flow describes." },
        steps: { type: "array", description: "Ordered step labels.", items: { type: "string" } },
        template: { type: "string", description: "Template label.", default: "custom" },
      },
      required: ["name"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const labels = Array.isArray(args.steps) ? (args.steps as string[]).slice(0, 12) : [];
      if (labels.length === 0) return fail("Provide at least one step label.");
      const all = ["Start", ...labels, "End"];
      const nodes = all.map((label, index) => ({
        id: `n${index + 1}`,
        type: (index === 0 ? "start" : index === all.length - 1 ? "end" : "process") as
          | "start"
          | "end"
          | "process",
        label,
        x: 40 + index * 190,
        y: 120,
        w: 150,
        h: 64,
        color: index === 0 ? "#10B981" : index === all.length - 1 ? "#2563EB" : "#F97316",
      }));
      const edges = nodes.slice(0, -1).map((node, index) => ({
        id: `e${index + 1}`,
        from: node.id,
        to: nodes[index + 1].id,
        label: undefined,
        dashed: false,
      }));
      const diagram = ctx.workspace.saveDiagram({
        name: String(args.name),
        description: String(args.description ?? `Generated by Bill Agent from ${labels.length} step(s).`),
        nodes,
        edges,
        template: String(args.template ?? "custom"),
      });
      return {
        ok: true,
        summary: `Saved diagram “${diagram.name}” with ${nodes.length} nodes and ${edges.length} edges.`,
        data: diagram,
      };
    },
  }),
  writeTool({
    name: "set_kid_safe",
    title: "Set kid-safe mode",
    group: "operations",
    description: "Turn the messenger's kid-safe mode on or off.",
    schema: {
      type: "object",
      properties: {
        on: { type: "boolean", description: "True to enable, false to disable." },
      },
      required: ["on"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const on = Boolean(args.on);
      ctx.workspace.setKidSafe(on);
      return { ok: true, summary: `Kid-safe mode ${on ? "enabled" : "disabled"}.`, data: { kidSafe: on } };
    },
  }),
  readTool({
    name: "mark_notifications_read",
    title: "Mark notifications read",
    group: "operations",
    description: "Clear the unread notification badge by marking every notification read.",
    schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: (ctx) => {
      const unread = ctx.workspace.notifications.filter((n) => !n.read).length;
      if (unread > 0) ctx.workspace.markAllNotificationsRead();
      return {
        ok: true,
        summary: unread === 0 ? "No unread notifications." : `Marked ${unread} notification(s) read.`,
        data: { cleared: unread },
      };
    },
  }),
];


/* ------------------------------------------------------------------ */
/* Computer-based English tests                                        */
/* ------------------------------------------------------------------ */

const examTools: ToolDefinition[] = [
  readTool({
    name: "list_exam_papers",
    title: "List exam papers",
    group: "education",
    description:
      "Show the computer-based English test papers available, with section counts, time and how many questions are auto-marked.",
    schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: () => ({
      ok: true,
      summary: `${EXAM_PAPERS.length} papers available.`,
      data: EXAM_PAPERS.map((paper) => ({
        id: paper.id,
        title: paper.title,
        level: paper.level,
        scale: paper.scale,
        minutes: paperMinutes(paper),
        sections: paper.sections.map((section) => ({
          id: section.id,
          skill: section.skill,
          title: section.title,
          minutes: section.minutes,
          questions: section.questions.length,
        })),
        markedQuestions: objectiveCount(paper),
      })),
    }),
  }),
  writeTool({
    name: "start_exam_attempt",
    title: "Start an exam attempt",
    group: "education",
    description:
      "Create a timed attempt for a paper and save it as a draft. Use this when a learner is about to sit a paper in the Exam room.",
    schema: {
      type: "object",
      properties: {
        paperId: {
          type: "string",
          description: `Paper id from list_exam_papers: ${EXAM_PAPERS.map((paper) => paper.id).join(", ")}.`,
        },
      },
      required: ["paperId"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const paper = getPaper(String(args.paperId));
      if (!paper) return fail(`No paper with id “${String(args.paperId)}”.`);
      const attempt = emptyAttempt(paper.id, uid("exam"));
      ctx.workspace.saveExamAttempt(attempt);
      return {
        ok: true,
        summary: `Started “${paper.title}” — ${paperMinutes(paper)} minutes across ${paper.sections.length} sections.`,
        data: attempt,
      };
    },
  }),
  writeTool({
    name: "grade_exam_attempt",
    title: "Grade an exam attempt",
    group: "education",
    description:
      "Mark a set of answers against a paper, blend the productive self-assessment and store the band-scored result. Answers map question ids to {selected:[optionIds]} or {text}. selfAssessed maps writing/speaking to a 1–9 score.",
    schema: {
      type: "object",
      properties: {
        paperId: {
          type: "string",
          description: `Paper id from list_exam_papers: ${EXAM_PAPERS.map((paper) => paper.id).join(", ")}.`,
        },
        answers: {
          type: "object",
          description: "Question id → { selected: [optionId], text: string }.",
        },
        selfAssessed: {
          type: "object",
          description: "Optional writing/speaking self score, e.g. { writing: 7, speaking: 6.5 }.",
        },
      },
      required: ["paperId", "answers"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const paper = getPaper(String(args.paperId));
      if (!paper) return fail(`No paper with id “${String(args.paperId)}”.`);
      const rawAnswers = (args.answers ?? {}) as Record<string, ExamAnswer>;
      const questionIds = new Set(
        paper.sections.flatMap((section) => section.questions.map((question) => question.id)),
      );
      const unknown = Object.keys(rawAnswers).filter((id) => !questionIds.has(id));
      const self = (args.selfAssessed ?? {}) as Record<string, number>;

      const attempt = {
        ...emptyAttempt(paper.id, uid("exam")),
        status: "submitted" as const,
        answers: rawAnswers,
        selfAssessed: Object.fromEntries(
          Object.entries(self)
            .filter(([key]) => key === "writing" || key === "speaking")
            .map(([key, value]) => [key, Math.max(1, Math.min(9, Number(value)))]),
        ),
      };
      const result = gradeAttempt(paper, attempt);
      const stored = { ...attempt, submittedAt: result.finishedAt, result };
      ctx.workspace.saveExamAttempt(stored);

      const sections = result.sections
        .map((section) =>
          section.max > 0
            ? `${section.title} ${section.raw}/${section.max}`
            : `${section.title} self ${formatBand(section.band)}`,
        )
        .join(" · ");
      return {
        ok: true,
        summary: `Graded “${paper.title}”: ${sections}. Overall ${
          paper.scale === "toefl" ? `${result.toeflTotal}/120` : `band ${formatBand(result.finalBand)}`
        } (${result.cefr}).${unknown.length ? ` Ignored unknown ids: ${unknown.join(", ")}.` : ""}`,
        data: stored,
      };
    },
  }),
  readTool({
    name: "list_exam_attempts",
    title: "List exam attempts",
    group: "education",
    description: "Show saved exam attempts with status, band, CEFR level and time spent.",
    schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: (ctx) => {
      const attempts = ctx.workspace.examAttempts;
      if (attempts.length === 0) return { ok: true, summary: "No exam attempts yet.", data: [] };
      return {
        ok: true,
        summary: `${attempts.length} attempt(s); best band ${
          formatBand(Math.max(...attempts.map((item) => item.result?.finalBand ?? 0)))
        }.`,
        data: attempts.map((item) => ({
          id: item.id,
          paperId: item.paperId,
          status: item.status,
          startedAt: item.startedAt,
          band: item.result?.finalBand ?? null,
          cefr: item.result?.cefr ?? null,
          minutes: Math.round(item.timeSpentSec / 60),
        })),
      };
    },
  }),
  writeTool({
    name: "delete_exam_attempt",
    title: "Delete an exam attempt",
    group: "education",
    description: "Permanently remove a saved attempt from the history.",
    schema: {
      type: "object",
      properties: {
        attemptId: { type: "string", description: "Attempt id from list_exam_attempts." },
      },
      required: ["attemptId"],
      additionalProperties: false,
    },
    run: (ctx, args) => {
      const id = String(args.attemptId);
      const attempt = ctx.workspace.examAttempts.find((item) => item.id === id);
      if (!attempt) return fail(`No attempt with id “${id}”.`);
      ctx.workspace.removeExamAttempt(id);
      return { ok: true, summary: `Deleted attempt ${id}.`, data: { id } };
    },
  }),
];

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const TOOLS: ToolDefinition[] = [
  ...crmTools,
  ...educationTools,
  ...marketingTools,
  ...knowledgeTools,
  ...messagingTools,
  ...communityTools,
  ...examTools,
];

export const TOOL_GROUPS: Array<{ id: ToolDefinition["group"]; label: string }> = [
  { id: "crm", label: "CRM & revenue" },
  { id: "education", label: "Education consultancy" },
  { id: "marketing", label: "AI marketing" },
  { id: "knowledge", label: "Knowledge" },
  { id: "messaging", label: "Messaging" },
  { id: "studios", label: "Studios" },
  { id: "operations", label: "Community & operations" },
];

export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

export function toolsByGroup(group: ToolDefinition["group"]): ToolDefinition[] {
  return TOOLS.filter((tool) => tool.group === group);
}

/** The compact description of the registry handed to a model. */
export function toolManifest() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    group: tool.group,
    description: tool.description,
    risk: tool.risk,
    requiresApproval: tool.requiresApproval,
    parameters: tool.schema,
  }));
}

/** The `tools` array for an OpenAI-compatible chat completion request. */
export function openAiToolSpecs() {
  return TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    },
  }));
}
