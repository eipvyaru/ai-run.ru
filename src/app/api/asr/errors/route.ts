import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAsrError } from "@/server/asr/errors";
import { consentedSession } from "@/server/asr/session";
import { isSameOrigin } from "@/server/security/origin";
import { asrEngineSchema, asrErrorCodeSchema, asrStageSchema } from "@/shared/asr";

export const runtime = "nodejs";
const eventSchema = z.object({ engine: asrEngineSchema, stage: asrStageSchema, code: asrErrorCodeSchema, durationMs: z.number().int().min(0).max(60000), httpStatus: z.number().int().min(100).max(599).optional() }).strict();
const attempts = new Map<string, { start: number; count: number }>();

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  const session = consentedSession(request);
  if (!session) return NextResponse.json({ code: "CONSENT_REQUIRED" }, { status: 403 });
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(size) || size > 4096) return NextResponse.json({ code: "INVALID_EVENT" }, { status: 413 });
  const current = Date.now();
  const prior = attempts.get(session);
  if (prior && current - prior.start < 60_000 && prior.count >= 20) return NextResponse.json({ code: "RATE_LIMITED" }, { status: 429 });
  if (attempts.size > 1024) for (const [key, value] of attempts) if (current - value.start > 60_000) attempts.delete(key);
  attempts.set(session, prior && current - prior.start < 60_000 ? { ...prior, count: prior.count + 1 } : { start: current, count: 1 });
  try {
    const event = eventSchema.parse(await request.json());
    recordAsrError(event);
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ code: "INVALID_EVENT" }, { status: 400 });
  }
}
