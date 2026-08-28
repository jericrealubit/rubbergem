-- bales_shift_config: one row (shift_id = 1) holding the CURRENT Bales
-- shift's setup, mirroring shift_config.sql for the Press line. Written by
-- components/BalesForm.tsx (debounced, login-gated upsert); read +
-- realtime-subscribed by app/BalesProductionTable.tsx.
--
-- No press_number/mat_types (Bales is a single line, not two presses with
-- 4-table mat setups). mesh_type replaces them as the one shift-wide
-- physical-setup value that changes rarely.
--
-- Not applied via a migration tool -- run this manually in the Supabase SQL
-- editor (same convention as shift_config.sql).

CREATE TABLE IF NOT EXISTS public.bales_shift_config (
  shift_id    INTEGER PRIMARY KEY,
  operator    TEXT,
  shift_group TEXT,              -- 'day' | 'night'
  mesh_type   TEXT,              -- e.g. "30"
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bales_shift_config ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. the boss, not logged in) can READ the current shift.
CREATE POLICY "bales_shift_config read" ON public.bales_shift_config
  FOR SELECT USING (true);

-- Only logged-in operators can WRITE.
CREATE POLICY "bales_shift_config insert" ON public.bales_shift_config
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bales_shift_config update" ON public.bales_shift_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Required for BalesProductionTable's realtime subscription:
ALTER PUBLICATION supabase_realtime ADD TABLE public.bales_shift_config;
