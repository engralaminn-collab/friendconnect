import { NextResponse } from "next/server";
import { TOOLS, TOOL_GROUPS } from "@/lib/agent/registry";
import { PROVIDERS } from "@/lib/agent/providers";

/**
 * Machine-readable inventory of everything Bill Agent can do.
 *
 * Deliberately static: no database, no session, no secrets. An MCP
 * client, an n8n node or a shell script can read this to discover the
 * tool names and their JSON schemas before posting commands.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      name: "bill-agent",
      displayName: "Bill Agent — workspace operator",
      version: "1.0.0",
      description:
        "Operates the FriendConnect workspace through a fixed tool registry. Commands are queued and executed by the open operator tab.",
      transport: {
        manifest: "/api/agent/manifest",
        enqueue: "POST /api/agent/commands",
        pending: "GET /api/agent/commands",
        settle: "POST /api/agent/commands/settle",
      },
      auth: {
        scheme: process.env.AGENT_TOKEN ? "bearer" : "none",
        note: process.env.AGENT_TOKEN
          ? "Send Authorization: Bearer $AGENT_TOKEN on every request."
          : "AGENT_TOKEN is not set on this deployment. Set it before exposing this API.",
      },
      counts: {
        tools: TOOLS.length,
        groups: TOOL_GROUPS.filter((group) => TOOLS.some((tool) => tool.group === group.id)).length,
        providers: PROVIDERS.length,
      },
      groups: TOOL_GROUPS,
      providers: PROVIDERS.map((provider) => ({
        id: provider.id,
        name: provider.name,
        kind: provider.kind,
        openSource: provider.openSource,
        licence: provider.licence,
        wire: provider.wire,
        defaultBaseUrl: provider.defaultBaseUrl,
        requiresKey: provider.requiresKey,
      })),
      tools: TOOLS.map((tool) => ({
        name: tool.name,
        title: tool.title,
        group: tool.group,
        description: tool.description,
        risk: tool.risk,
        requiresApproval: tool.requiresApproval,
        parameters: tool.schema,
        examples: tool.examples ?? [],
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
