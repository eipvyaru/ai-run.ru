import { vi, beforeEach, describe, expect, it } from "vitest";

const authState = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => name === "ai_run_admin" && authState.token ? { value: authState.token } : undefined }) }));

import { NextRequest } from "next/server";
import { PATCH as saveMode } from "@/app/api/admin/asr/route";
import { DELETE as clearErrors } from "@/app/api/admin/asr/errors/route";
import { getAsrSettings } from "@/server/asr/settings";
import { adminToken } from "@/server/auth/admin";
import { clearAsrErrors, recordAsrError } from "@/server/asr/errors";

const origin = "http://localhost:8787";

describe("ASR administrator writes", () => {
  beforeEach(async () => {
    authState.token = await adminToken();
    clearAsrErrors();
  });

  it("rejects cross-origin setting changes without changing the active mode", async () => {
    const request = new NextRequest(new URL("/api/admin/asr", origin), {
      method: "PATCH",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ engine: "browser" }),
    });
    expect((await saveMode(request)).status).toBe(403);
    expect(getAsrSettings().engine).toBe("sherpa");
  });

  it("requires explicit same-origin confirmation before clearing only the ASR log", async () => {
    recordAsrError({ engine: "browser", stage: "transcribing", code: "network" });
    const denied = await clearErrors(new NextRequest(new URL("/api/admin/asr/errors", origin), { method: "DELETE", headers: { origin } }));
    expect(denied.status).toBe(400);
    expect(clearAsrErrors()).toBe(1);
    recordAsrError({ engine: "browser", stage: "transcribing", code: "network" });
    const approved = await clearErrors(new NextRequest(new URL("/api/admin/asr/errors", origin), { method: "DELETE", headers: { origin, "x-confirm-clear-asr-log": "yes" } }));
    expect(approved.status).toBe(200);
    expect(await approved.json()).toEqual({ deleted: 1 });
  });
});
