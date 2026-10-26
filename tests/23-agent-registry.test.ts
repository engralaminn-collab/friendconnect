import { describe, expect, it } from "vitest";
import { TOOLS, TOOL_GROUPS, getTool, openAiToolSpecs, toolManifest } from "@/lib/agent/registry";
import { validateArgs } from "@/lib/agent/schema";

describe("tool registry", () => {
  it("has a stable, unique name for every tool", () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("declares a valid schema and a callable run for every tool", () => {
    for (const tool of TOOLS) {
      expect(tool.schema.type).toBe("object");
      expect(Array.isArray(tool.schema.required)).toBe(true);
      expect(typeof tool.run).toBe("function");
      expect(tool.title.length).toBeGreaterThan(2);
      expect(tool.description.length).toBeGreaterThan(20);
      for (const required of tool.schema.required) {
        expect(tool.schema.properties[required]).toBeDefined();
      }
      expect(["read", "write", "destructive"]).toContain(tool.risk);
      if (tool.risk === "destructive") expect(tool.requiresApproval).toBe(true);
    }
  });

  it("only uses groups that the UI can label", () => {
    const labels = new Set(TOOL_GROUPS.map((group) => group.id));
    for (const tool of TOOLS) {
      expect(labels.has(tool.group)).toBe(true);
    }
  });

  it("exposes the same inventory to a model as to the manifest", () => {
    expect(toolManifest()).toHaveLength(TOOLS.length);
    const specs = openAiToolSpecs();
    expect(specs).toHaveLength(TOOLS.length);
    expect(specs[0].type).toBe("function");
    expect(specs.map((spec) => spec.function.name)).toEqual(TOOLS.map((tool) => tool.name));
  });

  it("rejects unknown arguments instead of silently dropping them", () => {
    const tool = getTool("create_task");
    expect(tool).toBeDefined();
    const result = validateArgs(tool!.schema, { title: "Ship it", nonsense: true });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("nonsense");
  });

  it("coerces numbers and booleans written as strings", () => {
    const tool = getTool("create_deal");
    const result = validateArgs(tool!.schema, { title: "Renewal", value: "24,000", stage: "proposal" });
    expect(result.ok).toBe(true);
    expect(result.args.value).toBe(24000);
    expect(result.args.stage).toBe("proposal");
  });

  it("reports the offending field when an enum value is wrong", () => {
    const tool = getTool("move_contact_stage");
    const result = validateArgs(tool!.schema, { query: "jane", stage: "signed" });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("stage");
  });

  it("requires the fields it declares required", () => {
    const tool = getTool("create_contact");
    const result = validateArgs(tool!.schema, { name: "No Email" });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("email");
  });
});
