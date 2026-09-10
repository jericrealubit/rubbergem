-- banbury_live_log: give a logged check the cycle it was taken in.
--
-- A Banbury check used to be a single point in time (check_time only). The
-- form now works like PressForm/BalesForm: the operator taps TAP TO START to
-- open a check cycle, works the six chemical ticks and both tank levels, then
-- logs it -- so a row now spans start_time (the tap) to check_time (the log),
-- with run_time_minutes the whole interval between them. Because logging a
-- check immediately opens the next cycle, that interval doubles as the gap
-- since the previous check.
--
-- Both columns are nullable and no backfill is attempted: rows written before
-- this change genuinely have no start, and components/BanburyForm.tsx keeps
-- their original archive shape (start_time = the check's own clock time, no
-- end_time) so re-aggregating a shift mid-change doesn't duplicate them in
-- banbury_production_logs.checks.
--
-- Not applied via a migration tool -- run this manually in the Supabase SQL
-- editor (same convention as live_log_add_run_time.sql / banbury_live_log.sql).

ALTER TABLE public.banbury_live_log
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;

ALTER TABLE public.banbury_live_log
  ADD COLUMN IF NOT EXISTS run_time_minutes INTEGER;

-- PostgREST answers from a cached copy of the schema, and an ALTER on its own
-- does not invalidate it. Without this the ADD COLUMNs above appear to have
-- worked in the SQL editor while the app keeps failing every insert with
--   Could not find the 'run_time_minutes' column of 'banbury_live_log'
--   in the schema cache
-- (PGRST204) until the API happens to restart. Always run it with the ALTERs.
NOTIFY pgrst, 'reload schema';
