-- production_logs: one row per shift, written LIVE as the shift runs by
-- components/PressForm.tsx (insert on first cycle submit, update on every
-- cycle submit after) and read by components/ProductionHistory.tsx, which
-- renders with no auth gate so a logged-out viewer (e.g. the boss) can see
-- past shifts.
--
-- Not applied via a migration tool — run this manually in the Supabase SQL
-- editor (same convention as shift_config.sql / reset_shift_log.txt).
--
-- This only (re)creates the RLS policies; it assumes the production_logs
-- table already exists (see components/PressForm.tsx's logRow payload for
-- the columns it writes: date, machine_press, operator_shift,
-- table_line_output_yields, cycles, total_mats_produced, faulty_mats_produced).

ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. the boss, not logged in) can READ shift history —
-- mirrors shift_config.sql's "shift_config read" policy.
DROP POLICY IF EXISTS "production_logs read" ON public.production_logs;
CREATE POLICY "production_logs read" ON public.production_logs
  FOR SELECT USING (true);

-- Only logged-in operators can WRITE (PressForm.tsx already gates the
-- submit button on an active session).
DROP POLICY IF EXISTS "production_logs insert" ON public.production_logs;
CREATE POLICY "production_logs insert" ON public.production_logs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "production_logs update" ON public.production_logs;
CREATE POLICY "production_logs update" ON public.production_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
