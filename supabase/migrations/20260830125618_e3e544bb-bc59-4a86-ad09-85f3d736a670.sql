-- lovable-cron-fallback-reviewed: 1440 runs/day; uptime monitoring requires per-minute probing to honor user-configured 1-minute check intervals and fast downtime alerts
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'webwatch_cron_token';
  if v_id is null then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'webwatch_cron_token', 'Token for WebWatch monitoring cron');
  end if;
end $$;

create or replace function public.webwatch_cron_token()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'webwatch_cron_token' limit 1;
$$;

revoke all on function public.webwatch_cron_token() from public, anon, authenticated;
grant execute on function public.webwatch_cron_token() to service_role;

select cron.unschedule('webwatch-monitor') where exists (select 1 from cron.job where jobname = 'webwatch-monitor');

select cron.schedule(
  'webwatch-monitor',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://project--c3c51c42-0cd5-4d95-b8c3-f1d2bee95874-dev.lovable.app/api/public/cron/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'webwatch_cron_token' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $cron$
);