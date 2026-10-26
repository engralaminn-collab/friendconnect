import { NextResponse } from "next/server";
import { getTool } from "@/lib/agent/registry";
import {
  clearCommands,
  enqueueCommand,
  listCommands,
  pendingCommands,
} from "@/lib/agent/queue";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function authorised(request: Request): { ok: boolean; reason?: string } {
  const token = process.env.AGENT_TOKEN;
  if (!token) return { ok: true };
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("token") ?? "";
  if (bearer === token || query === token) return { ok: true };
  return { ok: false, reason: "Missing or invalid bearer token." };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const auth = authorised(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401, headers: CORS_HEADERS });
  }
  const url = new URL(request.url);
  const since = url.searchParams.get("since") ?? undefined;
  const all = url.searchParams.get("all") === "1";
  const commands = all ? listCommands() : pendingCommands(since);
  return NextResponse.json(
    {
      commands,
      pending: pendingCommands().length,
      hint: "The open /app/bill-agent tab drains this queue every few seconds.",
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = authorised(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body must be JSON: { \"tool\": string, \"args\": object }" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const toolName = typeof payload.tool === "string" ? payload.tool : "";
  const args =
    typeof payload.args === "object" && payload.args !== null && !Array.isArray(payload.args)
      ? (payload.args as Record<string, unknown>)
      : {};

  const tool = getTool(toolName);
  if (!tool) {
    return NextResponse.json(
      {
        error: `Unknown tool “${toolName}”.`,
        hint: "GET /api/agent/manifest for the full list.",
      },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const command = enqueueCommand(tool.name, args);
  return NextResponse.json(
    {
      ok: true,
      command,
      note: "Queued. It runs when an operator tab is open; results are POSTed to /api/agent/commands/settle.",
    },
    { status: 202, headers: CORS_HEADERS },
  );
}

export async function DELETE(request: Request) {
  const auth = authorised(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401, headers: CORS_HEADERS });
  }
  clearCommands();
  return NextResponse.json({ ok: true, cleared: true }, { headers: CORS_HEADERS });
}
