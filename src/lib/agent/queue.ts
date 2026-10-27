/* ============================================================
   Bill Agent — remote command queue
   ------------------------------------------------------------
   The browser is the only process that can touch the workspace
   store, so external callers (a cron job, an MCP client, a chat
   ops bot, n8n) post commands here and the open operator tab
   drains them. In-memory on purpose:
     · nothing is persisted to disk that could be replayed
     · a restart empties the queue in both directions
     · commands older than TTL are dropped, not executed late
   ============================================================ */

import type { RemoteCommand } from "./types";

const TTL_MS = 5 * 60_000;
const MAX_COMMANDS = 200;

type Queue = { commands: RemoteCommand[]; seq: number };

const globalForQueue = globalThis as unknown as { __fcAgentQueue?: Queue };

function queue(): Queue {
  if (!globalForQueue.__fcAgentQueue) {
    globalForQueue.__fcAgentQueue = { commands: [], seq: 0 };
  }
  return globalForQueue.__fcAgentQueue;
}

function alive(command: RemoteCommand): boolean {
  return Date.now() - new Date(command.createdAt).getTime() < TTL_MS;
}

export function enqueueCommand(
  tool: string,
  args: Record<string, unknown>,
): RemoteCommand {
  const store = queue();
  store.seq += 1;
  const command: RemoteCommand = {
    id: `cmd_${Date.now().toString(36)}_${store.seq}`,
    tool,
    args,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  store.commands = [command, ...store.commands.filter(alive)].slice(0, MAX_COMMANDS);
  return command;
}

export function listCommands(): RemoteCommand[] {
  const store = queue();
  store.commands = store.commands.filter(alive);
  return store.commands;
}

export function pendingCommands(since?: string): RemoteCommand[] {
  const sinceTime = since ? new Date(since).getTime() : 0;
  return listCommands().filter(
    (command) =>
      command.status === "pending" && new Date(command.createdAt).getTime() > sinceTime,
  );
}

export function settleCommand(
  id: string,
  status: "done" | "failed",
  result: string,
): RemoteCommand | undefined {
  const store = queue();
  const command = store.commands.find((item) => item.id === id);
  if (!command) return undefined;
  command.status = status;
  command.result = result.slice(0, 1_000);
  return command;
}

export function clearCommands(): void {
  queue().commands = [];
}
