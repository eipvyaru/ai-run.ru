PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'WAITING_CONSENT',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, consented_at TEXT,
  completed_at TEXT, email_sent_at TEXT, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
  consent_text TEXT NOT NULL, consent_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL, ip_address TEXT NOT NULL, user_agent TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consent_events (
  id TEXT PRIMARY KEY, consent_id TEXT NOT NULL REFERENCES consents(id),
  event_type TEXT NOT NULL, created_at TEXT NOT NULL, note TEXT
);
CREATE TABLE IF NOT EXISTS leads (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id),
  name_cipher TEXT, phone_cipher TEXT, name_alias TEXT, phone_alias TEXT,
  website TEXT, activity TEXT, process TEXT, problem TEXT, consequences TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK(role IN ('USER','ASSISTANT')), text TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id, id);
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id),
  calendar_event_id TEXT, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meetings_starts_at ON meetings(starts_at, status);
CREATE TABLE IF NOT EXISTS schedule_windows (
  weekday INTEGER PRIMARY KEY, enabled INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL
);
INSERT OR IGNORE INTO schedule_windows VALUES (1,1,'15:00','18:00'),(2,1,'15:00','18:00'),(3,1,'15:00','18:00'),(4,1,'15:00','18:00'),(5,1,'15:00','16:00'),(6,0,'00:00','00:00'),(0,0,'00:00','00:00');
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO settings VALUES ('meeting_duration_minutes','60',datetime('now')),('minimum_notice_hours','24',datetime('now')),('booking_horizon_days','28',datetime('now')),('debug_enabled','false',datetime('now'));
CREATE TABLE IF NOT EXISTS debug_dialogs (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE, started_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS debug_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, dialog_id TEXT NOT NULL REFERENCES debug_dialogs(id) ON DELETE CASCADE,
  role TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id), status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, created_at TEXT NOT NULL, sent_at TEXT
);
