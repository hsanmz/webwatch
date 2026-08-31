-- WebWatch D1 schema — auth (OTP via Telegram) + uptime monitoring.
-- Timestamps are stored as ISO-8601 UTC strings.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  chat_id TEXT,
  tg_username TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_otp_email ON otp_codes(email);

-- One-time tokens consumed through `/start <token>` deep links when a Telegram
-- chat is linked to an email during the OTP login flow.
CREATE TABLE telegram_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  chat_id TEXT,
  tg_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_tg_links_email ON telegram_links(email);

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  url TEXT NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 300,
  fail_threshold INTEGER NOT NULL DEFAULT 2,
  check_keyword TEXT,
  check_ssl INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  current_status TEXT NOT NULL DEFAULT 'unknown',
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  last_notified_at TEXT,
  ssl_last_warned_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sites_user ON sites(user_id);
CREATE INDEX idx_sites_active ON sites(is_active, last_checked_at);

CREATE TABLE checks (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status_code INTEGER,
  response_time_ms INTEGER,
  is_up INTEGER NOT NULL,
  error_message TEXT,
  checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_checks_site_checked ON checks(site_id, checked_at);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  error_message TEXT
);
CREATE INDEX idx_incidents_site ON incidents(site_id, started_at);