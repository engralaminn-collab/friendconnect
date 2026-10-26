"use client";

import * as React from "react";
import { CloudDownload, Database, FileUp, HardDriveDownload, RefreshCw } from "lucide-react";
import { workspaceApi } from "@/lib/api/resources";
import { ApiClientError } from "@/lib/api/client";
import {
  exportLegacyData,
  hasLegacyData,
  hasMigrated,
  importLegacyFile,
  runLocalMigration,
} from "@/lib/api/local-migration";
import { useToast } from "@/store/useUI";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Account-level data controls. Authoritative data lives in MySQL; this panel
 * handles server-side backups, importing the legacy localStorage workspace,
 * and one-off JSON restores. No silent overwrites — every import shows its
 * server-reported summary or an honest error.
 */
export function DataMigrationPanel() {
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [legacyPresent, setLegacyPresent] = React.useState(false);
  const [migrated, setMigrated] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLegacyPresent(hasLegacyData());
    setMigrated(hasMigrated());
  }, []);

  const exportServer = async () => {
    setBusy("server");
    try {
      const data = await workspaceApi.export();
      downloadJson(
        `friendconnect-server-backup-${new Date().toISOString().slice(0, 10)}.json`,
        data,
      );
      toast.success("Backup ready", "Your server-side workspace was downloaded.");
    } catch (err) {
      toast.error(
        "Backup failed",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const importLocal = async (force: boolean) => {
    setBusy(force ? "force" : "local");
    try {
      const result = await runLocalMigration(force);
      if (!result.migrated && !force) {
        toast.info("Nothing to migrate", "No legacy local workspace was found.");
      } else if ((result as { skipped?: boolean }).skipped) {
        toast.info("Already imported", "Use “Re-import” to overwrite server records.");
      } else {
        toast.success("Migration complete", "Your local workspace is now in your account.");
        setMigrated(true);
      }
    } catch (err) {
      toast.error(
        "Migration failed",
        err instanceof ApiClientError ? err.message : "Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File) => {
    setBusy("file");
    try {
      const result = await importLegacyFile(file, true);
      toast.success(
        "File imported",
        result.skipped ? "No new records (already imported)." : "Records were written to your account.",
      );
      setMigrated(true);
    } catch (err) {
      toast.error(
        "Import failed",
        err instanceof Error ? err.message : "Check the file and try again.",
      );
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="fc-card p-6">
        <h2 className="text-[17px] font-semibold">Your account data</h2>
        <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
          Messages, contacts, media and workspace records are stored persistently in the
          connected MySQL database — this browser is never the source of truth.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
            <CloudDownload className="size-5 text-brand-500" />
            <h3 className="mt-2 text-[13.5px] font-semibold">Server backup</h3>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              Download every workspace collection owned by your account as JSON.
            </p>
            <button
              onClick={() => void exportServer()}
              disabled={busy === "server"}
              className="btn btn-secondary btn-sm mt-3"
            >
              <HardDriveDownload className="size-3.5" />
              {busy === "server" ? "Preparing…" : "Download server backup"}
            </button>
          </div>

          <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
            <FileUp className="size-5 text-emerald-500" />
            <h3 className="mt-2 text-[13.5px] font-semibold">Restore from file</h3>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              Import a legacy workspace JSON export. Existing records are updated, never
              duplicated.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy === "file"}
              className="btn btn-secondary btn-sm mt-3"
            >
              <FileUp className="size-3.5" />
              {busy === "file" ? "Importing…" : "Choose JSON file"}
            </button>
          </div>
        </div>
      </div>

      <div className="fc-card p-6">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold">
          <Database className="size-4.5 text-[var(--color-accent-500)]" />
          Legacy local workspace
        </h2>
        <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
          Older versions kept data in this browser&apos;s localStorage. Move it into your
          account once; the local copy is kept untouched as a fallback.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {legacyPresent ? (
            <>
              <button
                onClick={() => void importLocal(false)}
                disabled={busy === "local"}
                className="btn btn-primary btn-sm"
              >
                <RefreshCw className="size-3.5" />
                {busy === "local" ? "Migrating…" : migrated ? "Re-run migration" : "Import local data"}
              </button>
              <button
                onClick={() => void importLocal(true)}
                disabled={busy === "force"}
                className="btn btn-secondary btn-sm"
              >
                {busy === "force" ? "Working…" : "Force re-import"}
              </button>
              <button onClick={exportLegacyData} className="btn btn-ghost btn-sm">
                <HardDriveDownload className="size-3.5" />
                Download legacy JSON
              </button>
            </>
          ) : (
            <p className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-[12.5px] text-[var(--fc-fg-muted)]">
              No legacy local workspace detected on this device.
            </p>
          )}
        </div>
        {migrated && (
          <p className="mt-3 text-[12px] text-emerald-600 dark:text-emerald-400">
            A migration has already run on this device; re-import safely upserts the same records.
          </p>
        )}
      </div>
    </div>
  );
}
