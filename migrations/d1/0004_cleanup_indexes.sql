-- Indexes to optimize the nightly purge/cleanup jobs (purgeOldData)
CREATE INDEX idx_checks_checked_at ON checks(checked_at);
CREATE INDEX idx_incidents_started_at ON incidents(started_at);
