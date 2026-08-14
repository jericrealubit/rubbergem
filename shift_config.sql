-- shift_config: one row (shift_id = 1) holding the CURRENT shift's setup so any
-- viewer (e.g. the boss on a remote screen) sees the live operator / shift / press /
-- run time / mat types. Written by components/PressForm.tsx (debounced, login-gated
-- upsert); read + realtime-subscribed by app/ProductionTable.tsx.
--
-- Not applied via a migration tool — run this manually in the Supabase SQL editor
-- (same convention as reset_shift_log.txt).

CREATE TABLE IF NOT EXISTS public.shift_config (
  shift_id         INTEGER PRIMARY KEY,
  operator         TEXT,
  shift_group      TEXT,                       -- 'day' | 'night'
  press_number     TEXT,                       -- '1' | '2'
  run_time_minutes INTEGER,
  mat_types        JSONB DEFAULT '{}'::jsonb,  -- {"1":"DF","2":"DD","3":"CF","4":"CD"}
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shift_config ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. the boss, not logged in) can READ the current shift.
CREATE POLICY "shift_config read" ON public.shift_config
  FOR SELECT USING (true);

-- Only logged-in operators can WRITE.
CREATE POLICY "shift_config insert" ON public.shift_config
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shift_config update" ON public.shift_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Required for ProductionTable's realtime subscription:
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_config;
