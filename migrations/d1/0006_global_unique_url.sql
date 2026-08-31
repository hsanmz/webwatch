-- A monitored URL can only be owned by one account.
-- Restore the global unique index on url, replacing the temporary per-user index.
DROP INDEX IF EXISTS idx_sites_user_url;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_url ON sites(url);
