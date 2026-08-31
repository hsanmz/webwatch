ALTER TABLE public.sites ADD COLUMN check_ssl BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sites ADD COLUMN ssl_last_warned_at TIMESTAMPTZ;