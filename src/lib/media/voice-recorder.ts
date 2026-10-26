"use client";

/**
 * Real voice-note recording on top of MediaRecorder. Produces an actual audio
 * Blob with duration; the UI uploads it through /api/media/upload.
 * Exposes explicit unsupported/permission-denied states instead of faking data.
 */
export type RecorderStatus = "idle" | "recording" | "denied" | "unsupported" | "error";

export interface VoiceResult {
  blob: Blob;
  mimeType: string;
  durationSec: number;
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startedAt = 0;
  private mimeType = "";

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    );
  }

  private pickMime(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported?.(type)) return type;
    }
    return "";
  }

  async start(): Promise<RecorderStatus> {
    if (!VoiceRecorder.isSupported()) return "unsupported";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = this.pickMime();
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);
      this.mimeType = this.mediaRecorder.mimeType || "audio/webm";
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.mediaRecorder.start();
      this.startedAt = Date.now();
      return "recording";
    } catch (err) {
      this.cleanupStream();
      if (err instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(err.name)) {
        return "denied";
      }
      return "error";
    }
  }

  /** Returns null when no audio bytes were produced. */
  async stop(cancel = false): Promise<VoiceResult | null> {
    if (!this.mediaRecorder) return null;
    const durationSec = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    const done = new Promise<Blob>((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const type = this.mimeType || "audio/webm";
        resolve(new Blob(this.chunks, { type }));
      };
    });
    if (this.mediaRecorder.state !== "inactive") this.mediaRecorder.stop();
    const blob = await done;
    this.cleanupStream();
    if (cancel || blob.size === 0) return null;
    return { blob, mimeType: blob.type || this.mimeType, durationSec };
  }

  private cleanupStream() {
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    this.mediaRecorder = null;
  }
}
