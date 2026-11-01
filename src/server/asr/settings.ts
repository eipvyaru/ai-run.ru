import { db } from "@/server/db/database";
import { asrEngineSchema, type AsrEngine } from "@/shared/asr";

export type AsrSettings = {
  engine: AsrEngine;
  silenceMs: number;
  noSpeechMs: number;
  maxDurationSeconds: number;
};

export function getAsrSettings(): AsrSettings {
  const rows = db().prepare("SELECT key,value FROM settings WHERE key LIKE 'asr_%'").all() as { key: string; value: string }[];
  const settings = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  return {
    engine: asrEngineSchema.parse(settings.asr_engine ?? "sherpa"),
    silenceMs: Number(settings.asr_silence_ms ?? 2000),
    noSpeechMs: Number(settings.asr_no_speech_ms ?? 10000),
    maxDurationSeconds: Number(settings.asr_max_duration_seconds ?? 60),
  };
}

export function saveAsrEngine(engine: AsrEngine): void {
  db().prepare("UPDATE settings SET value=?,updated_at=? WHERE key='asr_engine'").run(engine, new Date().toISOString());
}
