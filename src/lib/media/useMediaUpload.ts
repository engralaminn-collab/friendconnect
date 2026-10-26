"use client";

import * as React from "react";
import { mediaApi, type UploadedMedia } from "@/lib/api/resources";

export type UploadPhase = "idle" | "uploading" | "done" | "error";

export interface UploadState {
  phase: UploadPhase;
  progress: number;
  media: UploadedMedia | null;
  error: string | null;
}

/**
 * Upload hook used by the composer (files, images, voice notes). Returns real
 * progress events and surfaces server validation errors to the UI.
 */
export function useMediaUpload() {
  const [state, setState] = React.useState<UploadState>({
    phase: "idle",
    progress: 0,
    media: null,
    error: null,
  });

  const upload = React.useCallback(
    async (file: Blob, opts: { kind?: string; durationSec?: number } = {}) => {
      setState({ phase: "uploading", progress: 0, media: null, error: null });
      try {
        const result = await mediaApi.upload(file, {
          ...opts,
          onProgress: (pct) =>
            setState((s) => (s.phase === "uploading" ? { ...s, progress: pct } : s)),
        });
        setState({ phase: "done", progress: 100, media: result.media, error: null });
        return result.media;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setState({ phase: "error", progress: 0, media: null, error: message });
        throw err;
      }
    },
    [],
  );

  const reset = React.useCallback(
    () => setState({ phase: "idle", progress: 0, media: null, error: null }),
    [],
  );

  return { ...state, upload, reset };
}
