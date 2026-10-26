import { describe, it, expect } from "vitest";
import { sniffMediaType } from "@/server/storage/magic";

const u32 = (n: number) => Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const riff = (fourcc: string) =>
  Buffer.concat([Buffer.from("RIFF"), u32(36), Buffer.from(fourcc), Buffer.alloc(32, 7)]);
const ftyp = (brand: string) => {
  const box = Buffer.concat([Buffer.from("ftyp"), Buffer.from(brand), Buffer.alloc(8)]);
  return Buffer.concat([u32(8 + box.length), box, Buffer.alloc(24, 1)]);
};

describe("04 · magic-byte media sniffing", () => {
  const cases: Array<[string, Buffer, string, string]> = [
    ["PNG", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"), "image", "image/png"],
    ["JPEG", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16), Buffer.from([0xff, 0xd9])]), "image", "image/jpeg"],
    ["GIF", Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(16), Buffer.from([0x3b])]), "image", "image/gif"],
    ["WebP", riff("WEBP"), "image", "image/webp"],
    ["MP4", ftyp("isom"), "video", "video/mp4"],
    ["WAV", riff("WAVE"), "audio", "audio/wav"],
    ["Ogg", Buffer.concat([Buffer.from("OggS"), Buffer.alloc(32)]), "audio", "audio/ogg"],
    ["MP3", Buffer.concat([Buffer.from("ID3"), Buffer.alloc(20), Buffer.from([0xff, 0xfb]), Buffer.alloc(8)]), "audio", "audio/mpeg"],
    ["M4A", ftyp("M4A "), "audio", "audio/mp4"],
    ["PDF", Buffer.from("%PDF-1.4\nhello\n%%EOF\n"), "document", "application/pdf"],
    ["DOCX zip", Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(32)]), "document", "application/zip"],
    ["plain text", Buffer.from("just readable text, no null bytes here.\n"), "document", "text/plain"],
  ];

  for (const [label, bytes, kind, mime] of cases) {
    it(`identifies ${label} as ${kind}/${mime}`, () => {
      const result = sniffMediaType(bytes, mime);
      expect(result).not.toBeNull();
      expect(result?.kind).toBe(kind);
      expect(result?.mime).toBe(mime);
    });
  }

  it("classifies WebM audio flagged as voice into the voice kind", () => {
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(32, 2)]);
    const result = sniffMediaType(webm, "audio/webm");
    expect(result?.kind).toBe("audio");
  });

  it("rejects random binary, empty buffers and short input", () => {
    expect(sniffMediaType(Buffer.from(Array.from({ length: 64 }, () => Math.floor(Math.random() * 256))), "application/octet-stream")).toBeNull();
    expect(sniffMediaType(Buffer.alloc(0), "text/plain")).toBeNull();
    expect(sniffMediaType(Buffer.from("short"), "text/plain")).toBeNull();
  });
});
