import { afterEach, describe, expect, it } from "vitest";
import { clearAsrErrors, listAsrErrors, recordAsrError } from "@/server/asr/errors";
import { getAsrSettings, saveAsrEngine } from "@/server/asr/settings";

describe("ASR settings and bounded error journal", () => {
  afterEach(() => { clearAsrErrors(); });

  it("defaults to Sherpa and preserves the administrator selection", () => {
    expect(getAsrSettings().engine).toBe("sherpa");
    saveAsrEngine("browser");
    expect(getAsrSettings().engine).toBe("browser");
    expect(getAsrSettings()).toMatchObject({ silenceMs: 2000, noSpeechMs: 10000, maxDurationSeconds: 60 });
  });

  it("keeps only the latest 1000 safe events and bounds each UTF-8 event", () => {
    for (let index = 0; index < 1005; index += 1) {
      recordAsrError({ engine: "browser", stage: "transcribing", code: "network", durationMs: index });
    }
    const newest = listAsrErrors({ page: 1, pageSize: 20 });
    const oldest = listAsrErrors({ page: 50, pageSize: 20 });
    expect(newest.total).toBe(1000);
    expect(newest.rows).toHaveLength(20);
    expect(oldest.rows).toHaveLength(20);
    expect(Math.max(...oldest.rows.map((row) => row.id))).toBeLessThan(Math.min(...newest.rows.map((row) => row.id)));
    expect(newest.rows.every((row) => row.eventBytes <= 1024)).toBe(true);
    expect(Object.keys(newest.rows[0]).sort()).toEqual(["code", "createdAt", "durationMs", "engine", "eventBytes", "httpStatus", "id", "requestId", "stage"].sort());
  });
});
