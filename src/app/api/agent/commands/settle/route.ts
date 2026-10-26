import { NextResponse } from "next/server";
import { settleCommand } from "@/lib/agent/queue";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Called by the operator tab after it has executed a queued command.
 * External callers may also read the settled state through GET on
 * /api/agent/commands?all=1.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body must be JSON: { id, status: done|failed, result }" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const id = typeof payload.id === "string" ? payload.id : "";
  const status = payload.status === "failed" ? "failed" : "done";
  const result = typeof payload.result === "string" ? payload.result : "";

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400, headers: CORS_HEADERS });
  }

  const command = settleCommand(id, status, result);
  if (!command) {
    return NextResponse.json(
      { error: `No command with id ${id} (it may have expired after 5 minutes).` },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  return NextResponse.json({ ok: true, command }, { headers: CORS_HEADERS });
}
