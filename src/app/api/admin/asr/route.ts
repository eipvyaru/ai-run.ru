import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getAsrSettings, saveAsrEngine } from "@/server/asr/settings";
import { asrServiceReady } from "@/server/asr/client";
import { isSameOrigin } from "@/server/security/origin";
import { asrEngineSchema } from "@/shared/asr";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ...getAsrSettings(), modelReady: await asrServiceReady() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const body = asrEngineSchema.parse((await request.json() as { engine?: unknown }).engine);
    saveAsrEngine(body);
    return NextResponse.json({ ok: true, ...getAsrSettings(), modelReady: await asrServiceReady() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Некорректная настройка распознавания" }, { status: 400 });
  }
}
