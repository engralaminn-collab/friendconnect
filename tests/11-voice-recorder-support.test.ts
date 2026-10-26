import { describe, it, expect, afterEach } from "vitest";

describe("11 · voice recorder capability detection", () => {
  afterEach(() => {
    delete (globalThis as any).MediaRecorder;
    delete (globalThis as any).navigator;
  });

  it("honestly reports unsupported when media APIs are absent (headless Node)", async () => {
    const { VoiceRecorder } = await import("@/lib/media/voice-recorder");
    expect(VoiceRecorder.isSupported()).toBe(false);
    const recorder = new VoiceRecorder();
    const status = await recorder.start();
    expect(status).toBe("unsupported");
  });

  it("reports supported only when both getUserMedia and MediaRecorder exist", async () => {
    (globalThis as any).MediaRecorder = class {};
    (globalThis as any).navigator = {
      mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) },
    };
    const { VoiceRecorder } = await import("@/lib/media/voice-recorder");
    expect(VoiceRecorder.isSupported()).toBe(true);
  });

  it("returns denied status when the permission promise rejects", async () => {
    (globalThis as any).MediaRecorder = class {};
    (globalThis as any).navigator = {
      mediaDevices: {
        getUserMedia: async () => {
          const err = new DOMException("blocked", "NotAllowedError");
          throw err;
        },
      },
    };
    const { VoiceRecorder } = await import("@/lib/media/voice-recorder");
    const recorder = new VoiceRecorder();
    expect(await recorder.start()).toBe("denied");
  });
});
