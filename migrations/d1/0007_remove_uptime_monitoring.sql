-- Remove uptime monitoring tables and columns (keep only APM ingestion)

-- Drop uptime monitoring tables
DROP TABLE IF EXISTS checks;
DROP TABLE IF EXISTS incidents;

-- Drop uptime-related indexes BEFORE dropping the columns they reference
DROP INDEX IF EXISTS idx_checks_site_checked;
DROP INDEX IF EXISTS idx_incidents_site;
DROP INDEX IF EXISTS idx_sites_active;

-- Remove uptime-specific columns from sites
-- SQLite supports DROP COLUMN in D1
ALTER TABLE sites DROP COLUMN interval_seconds;
ALTER TABLE sites DROP COLUMN fail_threshold;
ALTER TABLE sites DROP COLUMN check_keyword;
ALTER TABLE sites DROP COLUMN check_ssl;
ALTER TABLE sites DROP COLUMN current_status;
ALTER TABLE sites DROP COLUMN consecutive_failures;
ALTER TABLE sites DROP COLUMN last_checked_at;
ALTER TABLE sites DROP COLUMN last_notified_at;
ALTER TABLE sites DROP COLUMN ssl_last_warned_at;

-- Keep is_active but repurpose for APM (enable/disable error ingestion)
-- Keep verification_token and verification_status for domain verification

-- Recreate the active-sites index on the surviving column
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active);
