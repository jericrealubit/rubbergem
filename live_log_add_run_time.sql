-- live_log: add a per-cycle snapshot of the shift's target run time.
-- The operator sets "Run Time (min)" per shift in components/PressForm.tsx
-- (mirrored to shift_config.run_time_minutes for remote viewers), but that
-- value can change mid-shift. Storing it on each live_log row at submission
-- time means each row permanently retains the value it was actually
-- submitted under, instead of reflecting whatever the shift-wide value is
-- "now."
--
-- Not applied via a migration tool — run this manually in the Supabase SQL
-- editor (same convention as shift_config.sql / reset_shift_log.txt /
-- production_logs_rls.sql).

ALTER TABLE public.live_log ADD COLUMN IF NOT EXISTS run_time_minutes INTEGER;
