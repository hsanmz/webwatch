-- Add domain verification and APM (Application Performance Monitoring) capabilities.

-- Domain Verification for sites
ALTER TABLE sites ADD COLUMN verification_token TEXT;
-- Set existing sites to verified so they don't break. New sites will be inserted with 'pending'.
ALTER TABLE sites ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'verified';

-- API Keys to authenticate SDKs for a specific site
CREATE TABLE api_keys (
  key TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_api_keys_site ON api_keys(site_id);

-- APM Events to capture frontend/backend/api errors and logs
CREATE TABLE apm_events (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'production',
  event_type TEXT NOT NULL, -- 'frontend_error', 'backend_error', 'api_error'
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  method TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_apm_events_site_time ON apm_events(site_id, created_at);
CREATE INDEX idx_apm_events_type ON apm_events(site_id, event_type);
