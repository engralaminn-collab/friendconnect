/* ============================================================
   Bill Agent — argument validation
   ------------------------------------------------------------
   A model will send anything. This validator coerces the common
   near-misses (numbers as strings, single values where an array
   is declared) and reports exactly which field is wrong so the
   loop can hand the error back to the model instead of guessing.
   ============================================================ */

import type { ToolSchema } from "./types";

export interface ValidationResult {
  ok: boolean;
  args: Record<string, unknown>;
  errors: string[];
}

function coerce(
  value: unknown,
  property: ToolSchema["properties"][string],
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    if (property.default !== undefined) return { ok: true, value: property.default };
    return { ok: false, error: "is required" };
  }

  switch (property.type) {
    case "string": {
      if (typeof value === "string") {
        if (property.enum && !property.enum.includes(value)) {
          return { ok: false, error: `must be one of: ${property.enum.join(", ")}` };
        }
        return { ok: true, value };
      }
      if (typeof value === "number" || typeof value === "boolean") {
        const asString = String(value);
        if (property.enum && !property.enum.includes(asString)) {
          return { ok: false, error: `must be one of: ${property.enum.join(", ")}` };
        }
        return { ok: true, value: asString };
      }
      return { ok: false, error: "must be a string" };
    }
    case "number": {
      if (typeof value === "number" && Number.isFinite(value)) return { ok: true, value };
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value.replace(/[,_\s]/g, ""));
        if (Number.isFinite(parsed)) return { ok: true, value: parsed };
      }
      return { ok: false, error: "must be a number" };
    }
    case "boolean": {
      if (typeof value === "boolean") return { ok: true, value };
      if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (["true", "yes", "1", "on"].includes(lowered)) return { ok: true, value: true };
        if (["false", "no", "0", "off"].includes(lowered)) return { ok: true, value: false };
      }
      return { ok: false, error: "must be true or false" };
    }
    case "array": {
      if (Array.isArray(value)) {
        const itemType = property.items?.type;
        if (!itemType) return { ok: true, value };
        const items = value.map((item) => {
          if (itemType === "number") {
            const parsed = typeof item === "number" ? item : Number(item);
            return Number.isFinite(parsed) ? parsed : null;
          }
          if (itemType === "boolean") return Boolean(item);
          return String(item);
        });
        if (items.some((item) => item === null)) {
          return { ok: false, error: "must be an array of numbers" };
        }
        return { ok: true, value: items };
      }
      if (typeof value === "string") {
        const parts = value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        return coerce(parts, { ...property, type: "array" });
      }
      // A single scalar where an array is declared is a common model slip.
      const single = coerce(value, {
        ...property,
        type: property.items?.type ?? "string",
      } as ToolSchema["properties"][string]);
      if (single.ok) return { ok: true, value: [single.value] };
      return { ok: false, error: "must be an array" };
    }
    case "object": {
      if (typeof value === "object" && !Array.isArray(value)) return { ok: true, value };
      return { ok: false, error: "must be an object" };
    }
  }
}

export function validateArgs(
  schema: ToolSchema,
  raw: Record<string, unknown> | undefined,
): ValidationResult {
  const input = raw ?? {};
  const errors: string[] = [];
  const args: Record<string, unknown> = {};

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(input)) {
      if (!(key in schema.properties)) {
        errors.push(`${key}: unknown argument (allowed: ${Object.keys(schema.properties).join(", ") || "none"})`);
      }
    }
  }

  for (const [name, property] of Object.entries(schema.properties)) {
    const result = coerce(input[name], property);
    if (result.ok) {
      if (result.value !== undefined) args[name] = result.value;
      continue;
    }
    const required = schema.required.includes(name);
    if (required || input[name] !== undefined) {
      errors.push(`${name}: ${result.error}`);
    }
  }

  for (const name of schema.required) {
    if (args[name] === undefined) {
      errors.push(`${name}: is required`);
    }
  }

  return { ok: errors.length === 0, args, errors: Array.from(new Set(errors)) };
}
