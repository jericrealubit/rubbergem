-- banbury_live_log: the six material/chemical checks now default to false.
--
-- The Banbury form used to run its six check buttons inverted: all six came up
-- pre-ticked (the paper sheet's normal row) and the operator tapped the ones
-- that HADN'T been done, turning them grey. That read backwards at the machine
-- -- doing the task and then pressing its button is what everyone reaches for,
-- and under the inverted flow that press turned the column into a red cross in
-- the audit grid. components/BanburyForm.tsx is now a plain press-to-confirm
-- toggle: every check starts grey and a press marks it done.
--
-- So "no value" has flipped meaning, and the column defaults follow it: an
-- absent tick must read as "not done", never as "assumed done".
--
-- This changes the DEFAULT only. Existing rows are left exactly as they are on
-- purpose -- they were recorded under the old flow and their true/false values
-- are still what the operator meant at the time. And the app has always
-- written all six booleans explicitly on every insert, so nothing in the
-- running app depends on this; it matters for rows inserted by hand in the SQL
-- editor, and it keeps the schema honest about what the column means.
--
-- Not applied via a migration tool -- run this manually in the Supabase SQL
-- editor (same convention as banbury_live_log_add_start_time.sql).

ALTER TABLE public.banbury_live_log
  ALTER COLUMN crumb_rubber        SET DEFAULT false,
  ALTER COLUMN other_rubbers       SET DEFAULT false,
  ALTER COLUMN powdered_chemicals  SET DEFAULT false,
  ALTER COLUMN rpo                 SET DEFAULT false,
  ALTER COLUMN sulphur             SET DEFAULT false,
  ALTER COLUMN liquid_chemicals    SET DEFAULT false;
