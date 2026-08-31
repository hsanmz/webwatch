-- Allow different accounts to monitor the same URL.
-- Replace the global unique index on url with a per-user unique index.
DROP INDEX IF EXISTS idx_sites_url;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_user_url ON sites(user_id, url);
