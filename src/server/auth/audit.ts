/**
 * Append-only audit logging. Sensitive values (passwords, tokens, file URLs)
 * must never be passed into `metadata`.
 */
import { getDb } from "../db/client";
import { auditEvents } from "../db/schema";
import { newId } from "./tokens";

export interface AuditInput {
  actorId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await getDb().insert(auditEvents).values({
      id: newId(),
      actorId: input.actorId ?? undefined,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ip: input.ip ?? undefined,
      userAgent: input.userAgent ? input.userAgent.slice(0, 300) : undefined,
      metadata: input.metadata ?? undefined,
    });
  } catch (err) {
    // Auditing must not break the primary request path.
    console.error("[audit] failed to record event", input.action, err);
  }
}
