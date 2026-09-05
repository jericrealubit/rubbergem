-- banbury_shift_config: one row (shift_id = 1) holding the CURRENT Banbury
-- shift's setup, mirroring shift_config.sql / bales_shift_config.sql for the
-- Press/Bales lines. Written by components/BanburyForm.tsx (debounced,
-- login-gated upsert); read + realtime-subscribed by app/BanburyTable.tsx.
--
-- Unlike Press/Bales, Banbury's "cycle" (a periodic chemical/tank checklist
-- entry, see banbury_live_log.sql) carries no per-entry output -- the paper
-- form's Batches Made / # 30 Mesh Bags / Run Time are shift-wide totals the
-- operator maintains directly, the same way mesh_type is a shift-wide value
-- on bales_shift_config. So this table also carries those scalars, unlike
-- shift_config.sql/bales_shift_config.sql which only hold setup values.
-- bag_weight_kg feeds the paper's own formula (Tonnes = Bags * Bag Weight /
-- 1000), computed client-side, not stored as a running total here.
--
-- Not applied via a migration tool -- run this manually in the Supabase SQL
-- editor (same convention as shift_config.sql / bales_shift_config.sql).

CREATE TABLE IF NOT EXISTS public.banbury_shift_config (
  shift_id         INTEGER PRIMARY KEY,
  operator         TEXT,
  shift_group      TEXT,              -- 'day' | 'night'
  product          TEXT,              -- e.g. "CB"
  bag_weight_kg    NUMERIC DEFAULT 700,
  batches_made     INTEGER DEFAULT 0,
  mesh_bags_count  INTEGER DEFAULT 0,
  run_time_minutes INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.banbury_shift_config ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. the boss, not logged in) can READ the current shift.
CREATE POLICY "banbury_shift_config read" ON public.banbury_shift_config
  FOR SELECT USING (true);

-- Only logged-in operators can WRITE.
CREATE POLICY "banbury_shift_config insert" ON public.banbury_shift_config
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "banbury_shift_config update" ON public.banbury_shift_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Required for BanburyTable's realtime subscription:
ALTER PUBLICATION supabase_realtime ADD TABLE public.banbury_shift_config;
