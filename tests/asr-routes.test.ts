import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as reportError } from "@/app/api/asr/errors/route";
import { GET as publicConfig } from "@/app/api/asr/config/route";
import { POST as transcribe } from "@/app/api/asr/transcribe/route";
import { GET as adminAsr } from "@/app/api/admin/asr/route";
import { clearAsrErrors, listAsrErrors } from "@/server/asr/errors";
import { createConsent } from "@/server/domain/sessions";
import { sign } from "@/server/security/crypto";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const origin = "http://localhost:8787";

function consentedRequest(path: string, body: object) {
  const session = createConsent("unavailable", "test-agent");
  return new NextRequest(new URL(path, origin), {
    method: "POST",
    headers: { origin, cookie: `ai_run_session=${sign(session)}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("ASR API security", () => {
  beforeEach(() => { clearAsrErrors(); });

  it("does not accept audio without the signed live consent session", async () => {
    const request = new NextRequest(new URL("/api/asr/transcribe", origin), {
      method: "POST", headers: { origin }, body: "",
    });
    const response = await transcribe(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "CONSENT_REQUIRED" });
  });

  it("rejects absent and cross-origin event requests", async () => {
    const absent = await reportError(new NextRequest(new URL("/api/asr/errors", origin), { method: "POST", body: "{}" }));
    expect(absent.status).toBe(403);
    const cross = consentedRequest("/api/asr/errors", { engine: "browser", stage: "recording", code: "network", durationMs: 1 });
    cross.headers.set("origin", "https://attacker.example");
    expect((await reportError(cross)).status).toBe(403);
    expect(listAsrErrors({ page: 1, pageSize: 10 }).total).toBe(0);
  });

  it("accepts only allowlisted technical events and drops free-text fields", async () => {
    const safe = await reportError(consentedRequest("/api/asr/errors", { engine: "browser", stage: "transcribing", code: "network", durationMs: 450 }));
    expect(safe.status).toBe(204);
    expect(listAsrErrors({ page: 1, pageSize: 10 }).rows[0]).toMatchObject({ engine: "browser", code: "network", durationMs: 450 });
    const unsafe = await reportError(consentedRequest("/api/asr/errors", { engine: "browser", stage: "transcribing", code: "network", durationMs: 1, transcript: "private text" }));
    expect(unsafe.status).toBe(400);
    expect(listAsrErrors({ page: 1, pageSize: 10 }).total).toBe(1);
  });

  it("keeps the public config free of internal endpoint and token values", async () => {
    const response = await publicConfig();
    const data = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data.engine).toBe("sherpa");
    expect(data).not.toHaveProperty("serviceUrl");
    expect(data).not.toHaveProperty("serviceToken");
  });

  it("requires admin authentication for the ASR settings API", async () => {
    expect((await adminAsr()).status).toBe(401);
  });
});
