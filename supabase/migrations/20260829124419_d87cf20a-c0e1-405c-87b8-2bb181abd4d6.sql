CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  url TEXT NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 300,
  fail_threshold INTEGER NOT NULL DEFAULT 2,
  check_keyword TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_status TEXT NOT NULL DEFAULT 'unknown',
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_checked_at TIMESTAMPTZ,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sites" ON public.sites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  status_code INTEGER,
  response_time_ms INTEGER,
  is_up BOOLEAN NOT NULL,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checks TO authenticated;
GRANT ALL ON public.checks TO service_role;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checks" ON public.checks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = checks.site_id AND s.user_id = auth.uid()));
CREATE INDEX idx_checks_site_time ON public.checks(site_id, checked_at DESC);
CREATE INDEX idx_sites_user ON public.sites(user_id);
CREATE INDEX idx_sites_due ON public.sites(is_active, last_checked_at);

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  error_message TEXT
);
GRANT SELECT ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own incidents" ON public.incidents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = incidents.site_id AND s.user_id = auth.uid()));
CREATE INDEX idx_incidents_site ON public.incidents(site_id, started_at DESC);

CREATE TABLE public.telegram_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.telegram_links TO authenticated;
GRANT ALL ON public.telegram_links TO service_role;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own links" ON public.telegram_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "create own links" ON public.telegram_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.telegram_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  username TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.telegram_accounts TO authenticated;
GRANT ALL ON public.telegram_accounts TO service_role;
ALTER TABLE public.telegram_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own telegram account" ON public.telegram_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "unlink own telegram" ON public.telegram_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);