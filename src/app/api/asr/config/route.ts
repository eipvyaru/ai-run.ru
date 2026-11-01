import { NextResponse } from "next/server";
import { getAsrSettings } from "@/server/asr/settings";
import { asrServiceReady } from "@/server/asr/client";

export const runtime = "nodejs";

export async function GET() {
  const settings = getAsrSettings();
  const modelReady = await asrServiceReady();
  return NextResponse.json({ engine: settings.engine, modelReady, maxDurationSeconds: settings.maxDurationSeconds, silenceMs: settings.silenceMs, noSpeechMs: settings.noSpeechMs }, { headers: { "Cache-Control": "no-store" } });
}
