-- Phase C: run the fca-api sync every 15 minutes (detect finished arenas, stage imports for
-- 1-click approval, sync standings, backfill exact game times, refresh achievements).
-- The anon key is the public client key already shipped in the web app.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'fca-sync';

select cron.schedule(
  'fca-sync',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://qimhjsxbnsgitxrmwjss.supabase.co/functions/v1/fca-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbWhqc3hibnNnaXR4cm13anNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzE0NDIsImV4cCI6MjEwMDMwNzQ0Mn0.eX1VV_buMumMp39zNiHIskq0tPeLwB5nxdIaGoiWX6M'
    ),
    body := '{"action":"tick"}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);
