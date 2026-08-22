-- production_logs: collapse duplicate shift rows, then stop new ones appearing.
--
-- WHY: production_logs is meant to hold one row per shift per day, but the
-- table has no shift key and nothing enforced that. Until the DB-backed row
-- resolution in components/PressForm.tsx, a submit decided which row to write
-- purely from localStorage["production_log_id"], so a second terminal, a
-- cleared browser store, or a mid-shift "Reset Shift Log" each inserted a
-- fresh row — e.g. the two 2026-08-21 day-shift rows.
--
-- The app no longer creates these, and components/ProductionHistory.tsx now
-- collapses any that remain so History always shows one entry per shift/day.
-- This file is the optional follow-up that cleans the database itself.
--
-- Not applied via a migration tool — run this manually in the Supabase SQL
-- editor (same convention as shift_config.sql / production_logs_rls.sql /
-- reset_shift_log.txt).
--
-- ⚠️  PART 2 DELETES ROWS AND CANNOT BE UNDONE. Run PART 1 first and read its
--     output. Run the three parts one at a time, in order.
--
-- The shift group is derived the same way the app derives it (see
-- lib/shift-log.ts `shiftGroupOf`): operator_shift is free text shaped like
-- "Jeric (night)", and anything not containing "night" is a day shift.


-- ---------------------------------------------------------------------------
-- PART 1 — INSPECT (read-only). Every (date, shift group) holding more than
-- one row, richest first within each group. Check that the rows you are about
-- to lose really are duplicates of the same shift before running PART 2.
-- ---------------------------------------------------------------------------

SELECT
  p.date,
  CASE WHEN position('night' in lower(p.operator_shift)) > 0
       THEN 'night' ELSE 'day' END       AS shift_group,
  p.id,
  p.operator_shift,
  p.machine_press,
  jsonb_array_length(COALESCE(p.cycles, '[]'::jsonb)) AS cycle_count,
  p.total_mats_produced,
  p.faulty_mats_produced
FROM public.production_logs p
WHERE (p.date, position('night' in lower(p.operator_shift)) > 0) IN (
  SELECT date, position('night' in lower(operator_shift)) > 0
  FROM public.production_logs
  GROUP BY date, position('night' in lower(operator_shift)) > 0
  HAVING count(*) > 1
)
ORDER BY
  p.date DESC,
  shift_group,
  jsonb_array_length(COALESCE(p.cycles, '[]'::jsonb)) DESC,
  p.id DESC;


-- ---------------------------------------------------------------------------
-- PART 2 — CLEAN UP (destructive). Keeps one row per (date, shift group): the
-- one with the most cycles, highest id breaking a tie — the same winner
-- ProductionHistory.tsx already displays. Deletes the rest.
--
-- Re-run PART 1 afterwards; it should return zero rows.
-- ---------------------------------------------------------------------------

DELETE FROM public.production_logs
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY date, position('night' in lower(operator_shift)) > 0
        ORDER BY
          jsonb_array_length(COALESCE(cycles, '[]'::jsonb)) DESC,
          id DESC
      ) AS rn
    FROM public.production_logs
  ) ranked
  WHERE ranked.rn > 1
);


-- ---------------------------------------------------------------------------
-- PART 3 — PREVENT. A unique index expressing "one row per shift per day"
-- without adding a shift_group column. Both lower() and position() are
-- IMMUTABLE, so the expression is indexable.
--
-- This FAILS while duplicates remain — run PART 2 first.
--
-- PressForm.tsx handles the resulting unique violation (SQLSTATE 23505) by
-- re-resolving the shift's row and updating it, so a race between two
-- terminals becomes a merge rather than an error the operator sees.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS production_logs_one_per_shift_day
  ON public.production_logs (
    date,
    (position('night' in lower(operator_shift)) > 0)
  );
