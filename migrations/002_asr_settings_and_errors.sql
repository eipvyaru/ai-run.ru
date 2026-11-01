INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES
  ('asr_engine','sherpa',datetime('now')),
  ('asr_silence_ms','2000',datetime('now')),
  ('asr_no_speech_ms','10000',datetime('now')),
  ('asr_max_duration_seconds','60',datetime('now'));

CREATE TABLE IF NOT EXISTS asr_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  engine TEXT NOT NULL CHECK(engine IN ('browser','sherpa','fallback')),
  stage TEXT NOT NULL CHECK(stage IN ('permission','recording','transcribing','fallback','request')),
  code TEXT NOT NULL CHECK(code IN ('audio-capture','network','no-speech','not-allowed','service-not-allowed','browser-unsupported','recording-failed','decode-failed','timeout','busy','server-error','not-ready','invalid-audio','audio-too-long')),
  duration_ms INTEGER NOT NULL CHECK(duration_ms BETWEEN 0 AND 60000),
  http_status INTEGER CHECK(http_status BETWEEN 100 AND 599),
  event_bytes INTEGER NOT NULL CHECK(event_bytes BETWEEN 1 AND 1024)
);
CREATE INDEX IF NOT EXISTS idx_asr_errors_created_at ON asr_errors(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_asr_errors_engine_code ON asr_errors(engine,code,id DESC);
