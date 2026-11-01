import { describe, expect, it } from "vitest";
import { supportsRecordedTrackRecognition } from "@/client/asr/browser";
import { mergeTranscript } from "@/client/asr/draft";

describe("recorded-audio browser fallback capability", () => {
  it("enables only desktop browser families with audioTrack support", () => {
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 Chrome/135.0.0.0 Safari/537.36")).toBe(true);
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 Chrome/156.0.8078.74 Safari/537.36")).toBe(true);
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 Edg/135.0.0.0 Chrome/135.0.0.0")).toBe(true);
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 OPR/120.0.0.0 Chrome/135.0.0.0")).toBe(true);
  });

  it("never probes microphone fallback in unsupported or mobile browsers", () => {
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 Chrome/134.0.0.0 Safari/537.36")).toBe(false);
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 Chrome/156.0.0.0 Mobile Safari/537.36 Android 16")).toBe(false);
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 Version/26.0 Safari/605.1.15")).toBe(false);
    expect(supportsRecordedTrackRecognition("Mozilla/5.0 Firefox/140.0")).toBe(false);
  });

  it("replaces interim text against the original draft without duplicating it", () => {
    const base = "Позвоните мне";
    expect(mergeTranscript(base, "завтра в три")).toBe("Позвоните мне завтра в три");
    expect(mergeTranscript(base, "завтра в три")).toBe("Позвоните мне завтра в три");
    expect(mergeTranscript("", "  Новый текст  ")).toBe("Новый текст");
  });
});
