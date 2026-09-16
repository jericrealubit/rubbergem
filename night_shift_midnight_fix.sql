-- Night shift past midnight: put the after-midnight cycles back on the shift
-- they belong to.
--
-- WHY: the forms used to stamp `*_production_logs.date` with the Perth
-- calendar date at the moment of writing. The night shift runs into the small
-- hours -- rostered to finish around 00:30, sometimes later -- so the moment
-- the Perth date rolled over, the shift stopped matching its own archive row
-- and a second row opened on the *next* day holding only the cycles logged
-- after midnight.
--
-- On screen that reads as a one-cycle night shift on a day nobody worked, and
-- the real shift is short those cycles: the 2026-09-16 night row holding one
-- 23:35 -> 00:19 cycle is the 14th cycle of the 2026-09-15 night shift, which
-- shows 13.
--
-- The date rollover also drove the stale-clear dialog: with no row found for
-- the new date, a terminal submitting at 00:19 was offered the running
-- shift's live_log rows as "stale", which is how these rows ended up holding
-- a single cycle rather than a re-archive of the whole shift.
--
-- The forms no longer do this -- components/PressForm.tsx, BalesForm.tsx and
-- BanburyForm.tsx now file work under `currentShiftDate()` (lib/shift-log.ts),
-- which keeps a night shift on the date it started until 06:00 -- and the
-- History views fold any remaining split rows back together on read, so
-- nothing renders twice while this file is still unapplied. This is the
-- follow-up that repairs the database itself.
--
-- Not applied via a migration tool -- run this manually in the Supabase SQL
-- editor (same convention as shift_config.sql / production_logs_rls.sql /
-- production_logs_dedupe.sql).
--
-- ⚠️  PART 2 AND ITS Bales/Banbury EQUIVALENTS CHANGE AND DELETE ROWS AND
--     CANNOT BE UNDONE. Run each line's inspect pass first and read its
--     output: it shows exactly which rows will be folded into which. Run the
--     parts one at a time, in order.
--
-- Re-running the whole file is safe: a folded row is gone, so a second pass
-- finds nothing left to do.
--
-- Run production_logs_dedupe.sql first if it has never been run. This file
-- copes with leftover duplicates (it folds into the richest row for a date,
-- the one History displays) but the two problems are easier to read apart.
--
-- Each line's section stands alone. If a line's tables do not exist on your
-- project yet, skip that section rather than running the file end to end.
--
-- The three tables do not agree on how `date` is stored: production_logs
-- predates the .sql files in this repo and holds a real DATE, while
-- bales_production_logs.sql and banbury_production_logs.sql declare TEXT
-- ('YYYY-MM-DD', Perth). Every comparison here is written `date::date` on
-- both sides so it works either way -- `x::date = y::date - 1` rather than
-- `x = to_char(...)`, which fails with "operator does not exist: date = text"
-- against the DATE column.


-- ===========================================================================
-- PART 0 -- HELPERS (safe to re-run; PART 9 drops them again)
--
-- These mirror lib/shift-log.ts exactly, so the repair and the app agree on
-- what a shift is. Each one names its TypeScript counterpart.
-- ===========================================================================

-- lib/shift-log.ts `NIGHT_SHIFT_ROLLOVER_HOUR`: the Perth hour before which
-- work still belongs to the previous calendar day's night shift. 06:00,
-- because no night shift ever *starts* before it.
CREATE OR REPLACE FUNCTION public.night_fix_rollover_hour()
RETURNS INT LANGUAGE sql IMMUTABLE AS $$ SELECT 6 $$;

-- lib/shift-log.ts `minutesOfDay`. NULL when the text isn't a time at all.
-- The mod 24 matches the JS: some ICU builds render midnight "24:05", and
-- those strings are already sitting in archived cycles arrays.
CREATE OR REPLACE FUNCTION public.night_fix_minutes_of_day(hhmm TEXT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN hhmm ~ '^[0-9]{1,2}:[0-9]{2}'
    THEN mod(split_part(hhmm, ':', 1)::int, 24) * 60
         + substring(hhmm from '^[0-9]{1,2}:([0-9]{2})')::int
  END;
$$;

-- lib/shift-log.ts `isNightMidnightSpillover`: TRUE when a row is not a shift
-- of its own but the tail of the previous day's night shift.
--
-- The test is "every entry ends before the rollover hour". A night shift that
-- genuinely started on this date has evening entries and can never qualify,
-- however few entries it has; a row whose entries all end in the small hours
-- can only be spillover. Entries are dated by end_time, falling back to
-- start_time for Banbury's older checks which have no end. An unparseable
-- time disqualifies the row rather than being assumed away.
--
-- The *start* time is deliberately not tested: the 23:35 -> 00:19 cycle that
-- prompted this starts before midnight and is exactly the case to catch.
CREATE OR REPLACE FUNCTION public.night_fix_is_spillover(
  operator_shift TEXT,
  entries JSONB
) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT position('night' in lower(coalesce(operator_shift, ''))) > 0
     AND jsonb_array_length(coalesce(entries, '[]'::jsonb)) > 0
     AND NOT EXISTS (
           SELECT 1
           FROM jsonb_array_elements(coalesce(entries, '[]'::jsonb)) AS e
           WHERE coalesce(
                   public.night_fix_minutes_of_day(
                     coalesce(nullif(e->>'end_time', ''), e->>'start_time')
                   ),
                   24 * 60
                 ) >= public.night_fix_rollover_hour() * 60
         );
$$;

-- lib/shift-log.ts `mergeCycles`: union two entry arrays, de-duplicated on
-- `cycle_number|start_time|end_time` with the spillover half winning a
-- collision, ordered the way a night shift actually ran -- the small hours
-- last, not sorted to the top by a plain "00:19" < "23:35" string compare.
--
-- The dedupe is what makes this safe to run against a spillover row that
-- re-archived the whole shift rather than just its tail: shared cycles
-- collapse instead of doubling.
CREATE OR REPLACE FUNCTION public.night_fix_merge_entries(host JSONB, tail JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  WITH combined AS (
    SELECT 0 AS half, ord, value
    FROM jsonb_array_elements(coalesce(host, '[]'::jsonb)) WITH ORDINALITY AS t(value, ord)
    UNION ALL
    SELECT 1 AS half, ord, value
    FROM jsonb_array_elements(coalesce(tail, '[]'::jsonb)) WITH ORDINALITY AS t(value, ord)
  ),
  keyed AS (
    SELECT
      half, ord, value,
      coalesce(value->>'cycle_number', '') || '|' ||
      coalesce(value->>'start_time', '')   || '|' ||
      coalesce(value->>'end_time', '')                            AS entry_key,
      public.night_fix_minutes_of_day(value->>'start_time')       AS start_minutes
    FROM combined
  ),
  deduped AS (
    SELECT DISTINCT ON (entry_key) *
    FROM keyed
    ORDER BY entry_key, half DESC, ord DESC
  )
  SELECT coalesce(
    jsonb_agg(value ORDER BY
      CASE
        WHEN start_minutes IS NULL THEN -1
        WHEN start_minutes < public.night_fix_rollover_hour() * 60
          THEN start_minutes + 24 * 60
        ELSE start_minutes
      END,
      half, ord
    ),
    '[]'::jsonb
  )
  FROM deduped;
$$;

-- lib/shift-log.ts `tableYieldsFromCycles`: roll merged cycles up into
-- production_logs.table_line_output_yields. good/reject are already baked into
-- each cycle's short_mold_json at submit time (the "max 1 reject per table per
-- cycle" rule -- see CLAUDE.md), so this only sums them; `type` is latest-wins,
-- which works because the merged cycles arrive in shift order.
CREATE OR REPLACE FUNCTION public.night_fix_table_yields(cycles JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(
    jsonb_object_agg(
      rolled.table_key,
      jsonb_build_object('good', rolled.good, 'reject', rolled.reject,
                         'type', rolled.mat_type)
    ),
    '{}'::jsonb
  )
  FROM (
    SELECT
      'table_' || i                                             AS table_key,
      coalesce(sum(coalesce((cell->>'good')::int, 0)), 0)       AS good,
      coalesce(sum(coalesce((cell->>'reject')::int, 0)), 0)     AS reject,
      coalesce(
        (array_agg(cell->>'type' ORDER BY ord DESC)
           FILTER (WHERE nullif(cell->>'type', '') IS NOT NULL))[1],
        '—'
      )                                                          AS mat_type
    FROM generate_series(1, 4) AS i
    CROSS JOIN LATERAL (
      SELECT e.ord, e.value->'short_mold_json'->('table_' || i) AS cell
      FROM jsonb_array_elements(coalesce(cycles, '[]'::jsonb))
           WITH ORDINALITY AS e(value, ord)
    ) cells
    GROUP BY i
  ) rolled;
$$;

-- lib/shift-log.ts `mergePressShiftRows`: TRUE when every merged cycle carries
-- the per-table good/reject that night_fix_table_yields needs. Rows backfilled
-- by migrate.js have `cycles` without `short_mold_json`, and for those the
-- stored yields are the only record.
CREATE OR REPLACE FUNCTION public.night_fix_cycles_carry_yields(cycles JSONB)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(coalesce(cycles, '[]'::jsonb)) AS e
    WHERE jsonb_typeof(e->'short_mold_json') IS DISTINCT FROM 'object'
       OR e->'short_mold_json' = '{}'::jsonb
  );
$$;

-- Add two rows' stored per-table yields, latest mat type winning -- the
-- fallback for rows whose cycles carry no short_mold_json.
CREATE OR REPLACE FUNCTION public.night_fix_add_yields(a JSONB, b JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(
    jsonb_object_agg(
      k,
      jsonb_build_object(
        'good',   coalesce((a->k->>'good')::int, 0)   + coalesce((b->k->>'good')::int, 0),
        'reject', coalesce((a->k->>'reject')::int, 0) + coalesce((b->k->>'reject')::int, 0),
        'type',   coalesce(nullif(b->k->>'type', ''), nullif(a->k->>'type', ''), '—')
      )
    ),
    '{}'::jsonb
  )
  FROM (SELECT 'table_' || i AS k FROM generate_series(1, 4) AS i) keys;
$$;

-- Sum one field across a table_line_output_yields object.
CREATE OR REPLACE FUNCTION public.night_fix_yield_total(yields JSONB, field TEXT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(sum(coalesce((value->>field)::int, 0)), 0)::int
  FROM jsonb_each(coalesce(yields, '{}'::jsonb));
$$;

-- Every spillover row paired with the night shift that owns it: the richest
-- non-spillover night row on the previous calendar day, which is the row
-- History displays for that shift. `host_id IS NULL` means there is nothing
-- to merge into -- the whole shift landed on the wrong date -- and PART 3
-- re-dates those instead.
CREATE OR REPLACE FUNCTION public.night_fix_pairs(
  table_name TEXT,
  entries_column TEXT
) RETURNS TABLE (spill_id BIGINT, host_id BIGINT, host_date TEXT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY EXECUTE format($f$
    SELECT
      s.id::bigint,
      h.id::bigint,
      to_char(s.date::date - 1, 'YYYY-MM-DD')
    FROM public.%1$I s
    LEFT JOIN LATERAL (
      SELECT p.id
      FROM public.%1$I p
      WHERE p.date::date = s.date::date - 1
        AND position('night' in lower(p.operator_shift)) > 0
        AND NOT public.night_fix_is_spillover(p.operator_shift, p.%2$I)
      ORDER BY jsonb_array_length(coalesce(p.%2$I, '[]'::jsonb)) DESC, p.id DESC
      LIMIT 1
    ) h ON TRUE
    WHERE public.night_fix_is_spillover(s.operator_shift, s.%2$I)
    ORDER BY s.date
  $f$, table_name, entries_column);
END;
$$;


-- ===========================================================================
-- PRESS -- public.production_logs
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- PART 1 -- INSPECT (read-only). Every night row that is really the previous
-- day's after-midnight tail, with the shift it will be folded into.
--
-- Read this before running PART 2. `into_id` NULL means there is no row to
-- merge with and PART 3 will re-date the row instead. `cycles_after` is what
-- the shift will show once merged -- for the 2026-09-15 night shift in the
-- report that raised this, 13 + 1 = 14.
-- ---------------------------------------------------------------------------

SELECT
  s.id                                                       AS spillover_id,
  s.date                                                     AS spillover_date,
  s.operator_shift,
  jsonb_array_length(coalesce(s.cycles, '[]'::jsonb))        AS cycles_moving,
  (SELECT string_agg((e->>'start_time') || '→' || (e->>'end_time'), ', ')
     FROM jsonb_array_elements(coalesce(s.cycles, '[]'::jsonb)) AS e)
                                                             AS times_moving,
  p.host_id                                                  AS into_id,
  p.host_date                                                AS into_date,
  jsonb_array_length(coalesce(h.cycles, '[]'::jsonb))        AS cycles_before,
  jsonb_array_length(
    public.night_fix_merge_entries(h.cycles, s.cycles)
  )                                                          AS cycles_after
FROM public.night_fix_pairs('production_logs', 'cycles') p
JOIN public.production_logs s ON s.id = p.spill_id
LEFT JOIN public.production_logs h ON h.id = p.host_id
ORDER BY s.date DESC;


-- ---------------------------------------------------------------------------
-- PART 2 -- MERGE (destructive). Folds each spillover row into the night
-- shift that owns it, then deletes the spillover row.
--
-- Mirrors lib/shift-log.ts `mergePressShiftRows`:
--   cycles  union by cycle key, small hours last;
--   yields  recomputed from the merged cycles when they all carry
--           short_mold_json (what the write path itself does, and immune to a
--           spillover row that re-archived cycles the host already holds);
--           otherwise the two rows' stored yields are added, but only when the
--           merge found no overlap -- an overlapping row already counts the
--           host's cycles, so adding would double them and the fuller row's
--           own figures are the better answer;
--   totals  follow the yields.
--
-- Re-run PART 1 afterwards; it should return zero rows.
-- ---------------------------------------------------------------------------

WITH pairs AS (
  SELECT * FROM public.night_fix_pairs('production_logs', 'cycles')
  WHERE host_id IS NOT NULL
),
folded AS (
  SELECT
    p.host_id,
    p.spill_id,
    public.night_fix_merge_entries(h.cycles, s.cycles)  AS cycles,
    h.table_line_output_yields                          AS host_yields,
    s.table_line_output_yields                          AS spill_yields,
    coalesce(h.total_mats_produced, 0)                  AS host_total,
    coalesce(s.total_mats_produced, 0)                  AS spill_total,
    coalesce(h.faulty_mats_produced, 0)                 AS host_faulty,
    coalesce(s.faulty_mats_produced, 0)                 AS spill_faulty,
    jsonb_array_length(coalesce(h.cycles, '[]'::jsonb))
      + jsonb_array_length(coalesce(s.cycles, '[]'::jsonb))
      = jsonb_array_length(
          public.night_fix_merge_entries(h.cycles, s.cycles)
        )                                               AS disjoint,
    jsonb_array_length(coalesce(s.cycles, '[]'::jsonb))
      > jsonb_array_length(coalesce(h.cycles, '[]'::jsonb))
                                                        AS spill_is_richer
  FROM pairs p
  JOIN public.production_logs h ON h.id = p.host_id
  JOIN public.production_logs s ON s.id = p.spill_id
),
resolved AS (
  SELECT
    f.host_id,
    f.spill_id,
    f.cycles,
    CASE
      WHEN public.night_fix_cycles_carry_yields(f.cycles)
        THEN public.night_fix_table_yields(f.cycles)
      WHEN f.disjoint
        THEN public.night_fix_add_yields(f.host_yields, f.spill_yields)
      WHEN f.spill_is_richer THEN f.spill_yields
      ELSE f.host_yields
    END                                                 AS yields,
    public.night_fix_cycles_carry_yields(f.cycles)      AS recomputed,
    f.disjoint,
    f.spill_is_richer,
    f.host_total, f.spill_total, f.host_faulty, f.spill_faulty
  FROM folded f
)
UPDATE public.production_logs t
SET cycles                   = r.cycles,
    table_line_output_yields = r.yields,
    total_mats_produced      = CASE
      WHEN r.recomputed      THEN public.night_fix_yield_total(r.yields, 'good')
      WHEN r.disjoint        THEN r.host_total + r.spill_total
      WHEN r.spill_is_richer THEN r.spill_total
      ELSE r.host_total
    END,
    faulty_mats_produced     = CASE
      WHEN r.recomputed      THEN public.night_fix_yield_total(r.yields, 'reject')
      WHEN r.disjoint        THEN r.host_faulty + r.spill_faulty
      WHEN r.spill_is_richer THEN r.spill_faulty
      ELSE r.host_faulty
    END
FROM resolved r
WHERE t.id = r.host_id;

DELETE FROM public.production_logs s
WHERE s.id IN (
  SELECT spill_id FROM public.night_fix_pairs('production_logs', 'cycles')
  WHERE host_id IS NOT NULL
);


-- ---------------------------------------------------------------------------
-- PART 3 -- VERIFY (read-only). Zero rows means every night shift now holds
-- its own after-midnight cycles.
--
-- Any row still listed is an ORPHAN: its cycles all ran in the small hours,
-- but there is no night shift on the previous day to merge it into. This
-- script deliberately leaves those alone rather than re-dating them. With no
-- evening half to check against, moving one is a guess -- and not a guess that
-- can be made twice, because a re-dated row still looks like spillover and
-- every later run would walk it back another day. Judge these by hand: if the
-- shift really started the previous evening, move it with
--
--   UPDATE public.production_logs
--   SET date = date::date - 1
--   WHERE id = <the id below>;
-- ---------------------------------------------------------------------------

SELECT id, date, operator_shift,
       jsonb_array_length(coalesce(cycles, '[]'::jsonb)) AS cycle_count,
       to_char(date::date - 1, 'YYYY-MM-DD')             AS probable_shift_date
FROM public.production_logs
WHERE public.night_fix_is_spillover(operator_shift, cycles)
ORDER BY date DESC;


-- ===========================================================================
-- BALES -- public.bales_production_logs
--
-- Same shape as Press. The totals are recomputed from the merged cycles
-- rather than added, exactly as BalesForm's own write path does: every Bales
-- cycle carries its own counts (this table has never been backfilled from a
-- legacy file), so recomputing is correct and immune to a spillover row that
-- re-archived cycles the host row already holds. Mirrors lib/bales-log.ts
-- `mergeBalesShiftRows`.
-- ===========================================================================

-- PART 5 -- INSPECT (read-only).
SELECT
  s.id                                                AS spillover_id,
  s.date                                              AS spillover_date,
  s.operator_shift,
  jsonb_array_length(coalesce(s.cycles, '[]'::jsonb)) AS cycles_moving,
  p.host_id                                           AS into_id,
  p.host_date                                         AS into_date,
  jsonb_array_length(coalesce(h.cycles, '[]'::jsonb)) AS cycles_before,
  jsonb_array_length(
    public.night_fix_merge_entries(h.cycles, s.cycles)
  )                                                   AS cycles_after
FROM public.night_fix_pairs('bales_production_logs', 'cycles') p
JOIN public.bales_production_logs s ON s.id = p.spill_id
LEFT JOIN public.bales_production_logs h ON h.id = p.host_id
ORDER BY s.date DESC;


-- PART 6 -- MERGE (destructive), then verify.
WITH folded AS (
  SELECT
    p.host_id,
    public.night_fix_merge_entries(h.cycles, s.cycles) AS cycles,
    nullif(
      concat_ws(' | ',
        nullif(btrim(coalesce(h.main_issues_faults, '')), ''),
        nullif(
          CASE
            WHEN btrim(coalesce(s.main_issues_faults, ''))
                 = btrim(coalesce(h.main_issues_faults, '')) THEN ''
            ELSE btrim(coalesce(s.main_issues_faults, ''))
          END, '')
      ), ''
    )                                                  AS main_issues_faults
  FROM public.night_fix_pairs('bales_production_logs', 'cycles') p
  JOIN public.bales_production_logs h ON h.id = p.host_id
  JOIN public.bales_production_logs s ON s.id = p.spill_id
  WHERE p.host_id IS NOT NULL
)
UPDATE public.bales_production_logs t
SET cycles                 = f.cycles,
    main_issues_faults     = f.main_issues_faults,
    total_bales_produced   = (SELECT coalesce(sum(coalesce((e->>'bales_produced')::int, 0)), 0)
                                FROM jsonb_array_elements(f.cycles) AS e),
    total_faulty_bales     = (SELECT coalesce(sum(coalesce((e->>'faulty_bales_count')::int, 0)), 0)
                                FROM jsonb_array_elements(f.cycles) AS e),
    total_run_time_minutes = (SELECT coalesce(sum(coalesce((e->>'run_time_minutes')::int, 0)), 0)
                                FROM jsonb_array_elements(f.cycles) AS e)
FROM folded f
WHERE t.id = f.host_id;

DELETE FROM public.bales_production_logs s
WHERE s.id IN (
  SELECT spill_id FROM public.night_fix_pairs('bales_production_logs', 'cycles')
  WHERE host_id IS NOT NULL
);

-- VERIFY. Anything left is an orphan -- see PART 3's note.
SELECT id, date, operator_shift,
       jsonb_array_length(coalesce(cycles, '[]'::jsonb)) AS cycle_count,
       to_char(date::date - 1, 'YYYY-MM-DD')             AS probable_shift_date
FROM public.bales_production_logs
WHERE public.night_fix_is_spillover(operator_shift, cycles)
ORDER BY date DESC;


-- ===========================================================================
-- BANBURY -- public.banbury_production_logs
--
-- Only the checklist entries merge. Everything else on a Banbury row
-- (Batches Made, # Bags, Tonnes, Run Time, Average Output P/H) is a
-- shift-level scalar the operator maintains directly and the form rewrites in
-- full on every check, so the two rows hold two snapshots of the same running
-- totals, not two halves to add up -- adding them would double the shift. The
-- spillover row is the later write, so its figures win wherever the operator
-- actually entered one. Mirrors lib/banbury-log.ts `mergeBanburyShiftRows`.
-- ===========================================================================

-- PART 7 -- INSPECT (read-only).
SELECT
  s.id                                                AS spillover_id,
  s.date                                              AS spillover_date,
  s.operator_shift,
  jsonb_array_length(coalesce(s.checks, '[]'::jsonb)) AS checks_moving,
  p.host_id                                           AS into_id,
  p.host_date                                         AS into_date,
  jsonb_array_length(coalesce(h.checks, '[]'::jsonb)) AS checks_before,
  jsonb_array_length(
    public.night_fix_merge_entries(h.checks, s.checks)
  )                                                   AS checks_after
FROM public.night_fix_pairs('banbury_production_logs', 'checks') p
JOIN public.banbury_production_logs s ON s.id = p.spill_id
LEFT JOIN public.banbury_production_logs h ON h.id = p.host_id
ORDER BY s.date DESC;


-- PART 8 -- MERGE (destructive), then verify.
WITH folded AS (
  SELECT
    p.host_id,
    public.night_fix_merge_entries(h.checks, s.checks)               AS checks,
    coalesce(nullif(s.product, ''), h.product)                       AS product,
    coalesce(nullif(s.bag_weight_kg, 0), h.bag_weight_kg)            AS bag_weight_kg,
    coalesce(nullif(s.batches_made, 0), h.batches_made)              AS batches_made,
    coalesce(nullif(s.mesh_bags_count, 0), h.mesh_bags_count)        AS mesh_bags_count,
    coalesce(nullif(s.tonnes, 0), h.tonnes)                          AS tonnes,
    coalesce(nullif(s.run_time_minutes, 0), h.run_time_minutes)      AS run_time_minutes,
    coalesce(nullif(s.average_output_ph, 0), h.average_output_ph)    AS average_output_ph
  FROM public.night_fix_pairs('banbury_production_logs', 'checks') p
  JOIN public.banbury_production_logs h ON h.id = p.host_id
  JOIN public.banbury_production_logs s ON s.id = p.spill_id
  WHERE p.host_id IS NOT NULL
)
UPDATE public.banbury_production_logs t
SET checks            = f.checks,
    product           = f.product,
    bag_weight_kg     = f.bag_weight_kg,
    batches_made      = f.batches_made,
    mesh_bags_count   = f.mesh_bags_count,
    tonnes            = f.tonnes,
    run_time_minutes  = f.run_time_minutes,
    average_output_ph = f.average_output_ph
FROM folded f
WHERE t.id = f.host_id;

DELETE FROM public.banbury_production_logs s
WHERE s.id IN (
  SELECT spill_id FROM public.night_fix_pairs('banbury_production_logs', 'checks')
  WHERE host_id IS NOT NULL
);

-- VERIFY. Anything left is an orphan -- see PART 3's note.
SELECT id, date, operator_shift,
       jsonb_array_length(coalesce(checks, '[]'::jsonb)) AS check_count,
       to_char(date::date - 1, 'YYYY-MM-DD')             AS probable_shift_date
FROM public.banbury_production_logs
WHERE public.night_fix_is_spillover(operator_shift, checks)
ORDER BY date DESC;


-- ===========================================================================
-- PART 9 -- CLEAN UP. The helpers exist only for this repair; the app never
-- calls them. Drop them once every line's verify pass comes back empty.
-- ===========================================================================

DROP FUNCTION IF EXISTS public.night_fix_pairs(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.night_fix_yield_total(JSONB, TEXT);
DROP FUNCTION IF EXISTS public.night_fix_add_yields(JSONB, JSONB);
DROP FUNCTION IF EXISTS public.night_fix_cycles_carry_yields(JSONB);
DROP FUNCTION IF EXISTS public.night_fix_table_yields(JSONB);
DROP FUNCTION IF EXISTS public.night_fix_merge_entries(JSONB, JSONB);
DROP FUNCTION IF EXISTS public.night_fix_is_spillover(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.night_fix_minutes_of_day(TEXT);
DROP FUNCTION IF EXISTS public.night_fix_rollover_hour();
