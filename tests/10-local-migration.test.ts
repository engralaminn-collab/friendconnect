import { describe, it, expect, vi, beforeEach } from "vitest";

function installLocalStorage(initial: Record<string, string>) {
  const store = new Map(Object.entries(initial));
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  return store;
}

describe("10 · legacy local-data migration", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).window;
  });

  it("reports no legacy data when the localStorage key is absent", async () => {
    installLocalStorage({});
    const { hasLegacyData, runLocalMigration } = await import("@/lib/api/local-migration");
    expect(hasLegacyData()).toBe(false);
    const result = await runLocalMigration();
    expect(result.migrated).toBe(false);
  });

  it("maps legacy workspace collections into the server import contract", async () => {
    const payload = {
      state: {
        threads: [{ id: "t1", contactName: "Old Chat" }],
        contacts: [{ id: "c1", name: "Old Contact" }],
        companies: [{ id: "co1", name: "Acme" }],
        notes: [{ id: "n1", title: "Note" }],
        notifications: [],
      },
      version: 1,
    };
    installLocalStorage({ "friendconnect-workspace-v1": JSON.stringify(payload) });

    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ ok: true, data: { imported: 4, skipped: 0 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { hasLegacyData, runLocalMigration } = await import("@/lib/api/local-migration");
    expect(hasLegacyData()).toBe(true);
    const result = await runLocalMigration();
    expect(result.migrated).toBe(true);

    const init = fetchMock.mock.calls[0][1]!;
    const body = JSON.parse(init.body as string);
    expect(body.threads).toHaveLength(1);
    expect(body.contacts).toHaveLength(1);
    expect(body.workspace["crm-companies"]).toHaveLength(1);
    expect(body.workspace["kb-notes"]).toHaveLength(1);
    expect(body.workspace["crm-companies"][0].recordId).toBe("co1");
  });

  it("never runs twice once the completion marker is set", async () => {
    installLocalStorage({
      "friendconnect-workspace-v1": JSON.stringify({ state: { notes: [] } }),
      "friendconnect-migration-v1": JSON.stringify({ at: new Date().toISOString() }),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { runLocalMigration } = await import("@/lib/api/local-migration");
    const result = await runLocalMigration();
    expect(result.migrated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
