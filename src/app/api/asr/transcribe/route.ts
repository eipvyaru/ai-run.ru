import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordAsrError } from "@/server/asr/errors";
import { asrErrorStatus, publicAsrErrorCode, transcribeWithSherpa } from "@/server/asr/client";
import { consentedSession } from "@/server/asr/session";
import { isSameOrigin } from "@/server/security/origin";

export const runtime = "nodejs";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_AUDIO_BYTES + 128 * 1024;

function safeRecord(code: ReturnType<typeof publicAsrErrorCode>, requestId: string, durationMs: number, status: number) {
  try { recordAsrError({ engine: "sherpa", stage: "transcribing", code, durationMs, httpStatus: status }); } catch { /* Journal failure must not block text input or safe error response. */ }
  return NextResponse.json({ requestId, code, fallback: true }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  if (!consentedSession(request)) return NextResponse.json({ code: "CONSENT_REQUIRED" }, { status: 403 });
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_MULTIPART_BYTES)) return safeRecord("audio-too-long", randomUUID(), 0, 413);

  let form: FormData;
  try { form = await request.formData(); }
  catch { return safeRecord("invalid-audio", randomUUID(), 0, 400); }
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size < 1) return safeRecord("invalid-audio", randomUUID(), 0, 400);
  if (audio.size > MAX_AUDIO_BYTES) return safeRecord("audio-too-long", randomUUID(), 0, 413);

  const started = Date.now();
  const result = await transcribeWithSherpa(audio);
  if (result.ok) return NextResponse.json({ requestId: result.requestId, engine: "sherpa", text: result.text }, { headers: { "Cache-Control": "no-store" } });
  const code = publicAsrErrorCode(result.code);
  const status = asrErrorStatus(result.code);
  return safeRecord(code, result.requestId, Date.now() - started, status);
}
