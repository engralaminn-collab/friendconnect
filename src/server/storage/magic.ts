/**
 * Content sniffing from real file bytes (magic numbers) rather than trusting
 * the browser-provided MIME type or filename extension.
 */

export type MediaKind = "image" | "video" | "audio" | "voice" | "document";

export interface SniffResult {
  mime: string;
  kind: MediaKind;
  ext: string;
}

function ascii(buf: Buffer, start: number, len: number): string {
  return buf.subarray(start, start + len).toString("latin1");
}

function isLikelyText(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 2048));
  if (sample.length === 0) return false;
  let bad = 0;
  for (const b of sample) {
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) bad++;
  }
  return bad / sample.length < 0.02;
}

/**
 * Validate the bytes against the declared expectation. `expectedKind` lets the
 * caller distinguish a voice note from a music file even though both are audio.
 */
export function sniffMediaType(buf: Buffer, declaredMime: string): SniffResult | null {
  if (buf.length < 12) return null;
  const head = buf.subarray(0, 16);

  // ---- Images -----------------------------------------------------------
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { mime: "image/jpeg", kind: "image", ext: "jpg" };
  }
  if (ascii(head, 0, 4) === "\x89PNG") {
    return { mime: "image/png", kind: "image", ext: "png" };
  }
  if (ascii(head, 0, 4) === "GIF8") {
    return { mime: "image/gif", kind: "image", ext: "gif" };
  }
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP") {
    return { mime: "image/webp", kind: "image", ext: "webp" };
  }

  // ---- Audio / video containers -----------------------------------------
  const isMatroska = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
  if (isMatroska) {
    // Matroska/WebM: distinguish by declared MIME, validate family only.
    if (declaredMime.startsWith("video/")) return { mime: "video/webm", kind: "video", ext: "webm" };
    return {
      mime: "audio/webm",
      kind: declaredMime === "voice/webm" ? "voice" : "audio",
      ext: "webm",
    };
  }
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WAVE") {
    return { mime: "audio/wav", kind: "audio", ext: "wav" };
  }
  if (ascii(head, 0, 4) === "OggS") {
    return { mime: "audio/ogg", kind: "audio", ext: "ogg" };
  }
  if (ascii(head, 0, 3) === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)) {
    return { mime: "audio/mpeg", kind: "audio", ext: "mp3" };
  }
  if (ascii(head, 4, 4) === "ftyp") {
    const brand = ascii(head, 8, 4);
    if (["M4A ", "M4B ", "M4P "].includes(brand)) {
      return { mime: "audio/mp4", kind: "audio", ext: "m4a" };
    }
    if (declaredMime.startsWith("audio/")) {
      return { mime: "audio/mp4", kind: "audio", ext: "m4a" };
    }
    return { mime: "video/mp4", kind: "video", ext: "mp4" };
  }
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "AVI ") {
    return { mime: "video/x-msvideo", kind: "video", ext: "avi" };
  }

  // ---- Documents ---------------------------------------------------------
  if (ascii(head, 0, 4) === "%PDF") {
    return { mime: "application/pdf", kind: "document", ext: "pdf" };
  }
  // ZIP-family: docx/xlsx/pptx/docx and plain zip.
  if (head[0] === 0x50 && head[1] === 0x4b && (head[2] === 3 || head[2] === 7)) {
    const lower = declaredMime.toLowerCase();
    if (lower.includes("word") || lower.includes("docx"))
      return {
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        kind: "document",
        ext: "docx",
      };
    if (lower.includes("sheet") || lower.includes("xlsx"))
      return {
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        kind: "document",
        ext: "xlsx",
      };
    if (lower.includes("presentation") || lower.includes("pptx"))
      return {
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        kind: "document",
        ext: "pptx",
      };
    return { mime: "application/zip", kind: "document", ext: "zip" };
  }
  if (isLikelyText(buf)) {
    return { mime: "text/plain", kind: "document", ext: "txt" };
  }
  return null;
}

export const MAX_UPLOAD_BYTES_DEFAULT = 25 * 1024 * 1024;
