// Shared shift-identity + cycle-merge helpers for the production_logs archive.
//
// production_logs holds one row per shift per day, but the table has no
// shift_group column -- the shift is embedded in the free-text operator_shift
// value as `${operator} (${shift})`. Both the write path
// (components/PressForm.tsx) and the read path
// (components/ProductionHistory.tsx) have to derive the shift group from that
// string, and they have to agree, so the derivation lives here once.

/**
 * Turn a caught `unknown` into a readable string for toasts/alerts.
 *
 * Supabase client calls reject with a `PostgrestError`-shaped plain object
 * (`{ message, details, hint, code }`), not an `Error` instance, so the old
 * `err instanceof Error ? err.message : String(err)` pattern used across the
 * forms fell through to `String(err)` for every Supabase failure and printed
 * the useless "[object Object]" instead of the actual message.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * True when a Supabase/PostgREST failure is "that column isn't there",
 * naming one of `columns`.
 *
 * Every table in this project is applied by hand in the Supabase SQL editor
 * (see the .sql files at the repo root), so a column added in a later script
 * can be live in the code and missing from the database. PostgREST reports
 * that two different ways: `PGRST204` on a write, whose message reads
 * "Could not find the 'run_time_minutes' column of 'banbury_live_log' in the
 * schema cache", and Postgres' own `42703` ("column ... does not exist") on a
 * read. Both are worth telling apart from a real failure, because a caller
 * can usually fall back to the pre-migration shape instead of losing the
 * operator's entry.
 *
 * Note PGRST204 also fires when the ALTER *has* been run but PostgREST is
 * still serving a stale schema cache -- hence the `NOTIFY pgrst,
 * 'reload schema';` at the end of the ADD COLUMN scripts.
 */
export function isMissingColumnError(
  err: unknown,
  columns: readonly string[],
): boolean {
  if (!err || typeof err !== "object") return false;
  const { code } = err as { code?: unknown };
  if (code !== "PGRST204" && code !== "42703") return false;
  const message = describeError(err);
  return columns.some((column) => message.includes(column));
}

export type ShiftGroup = "day" | "night";

/**
 * Derive the shift group from a production_logs `operator_shift` value
 * (e.g. "Jeric (night)"). Anything that isn't recognisably a night shift is
 * treated as a day shift, matching how History has always read these rows.
 */
export function shiftGroupOf(operatorShift: string | null | undefined): ShiftGroup {
  return (operatorShift || "").toLowerCase().includes("night") ? "night" : "day";
}

// ---------------------------------------------------------------------------
// Perth wall clock, and the night shift that outlives the calendar day
// ---------------------------------------------------------------------------

const PERTH_TIME_ZONE = "Australia/Perth";

/**
 * Perth wall-clock hour before which work still belongs to the *previous*
 * calendar day's night shift.
 *
 * The night shift runs into the small hours -- rostered to finish around
 * 00:30, occasionally later -- so a cycle logged at 00:19 on the 16th is the
 * tail of the shift that started on the evening of the 15th, not a one-cycle
 * shift of its own. 06:00 is the cutoff because no night shift ever *starts*
 * before it, which makes "night shift, Perth clock before 06:00" an
 * unambiguous "this is yesterday's shift still running".
 */
export const NIGHT_SHIFT_ROLLOVER_HOUR = 6;

/** Minutes past midnight that the rollover hour sits at. */
const NIGHT_SHIFT_ROLLOVER_MINUTES = NIGHT_SHIFT_ROLLOVER_HOUR * 60;

/** Perth `YYYY-MM-DD` for an instant (default: now). */
export function perthDateOf(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PERTH_TIME_ZONE,
  }).format(instant);
}

/** Perth `HH:mm` for an instant (default: now). */
export function perthTimeOf(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PERTH_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/**
 * A Perth `HH:mm` wall-clock string as minutes past midnight, or null when it
 * isn't a time at all.
 *
 * The `% 24` is not paranoia: some ICU builds render midnight as "24:05"
 * under an h24 hour cycle, and those strings are already sitting in archived
 * `cycles` arrays.
 */
export function minutesOfDay(hhmm: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec((hhmm || "").trim());
  if (!match) return null;
  const minutes = Number(match[2]);
  if (minutes > 59) return null;
  return (Number(match[1]) % 24) * 60 + minutes;
}

/**
 * Add days to a `YYYY-MM-DD` shift date.
 *
 * Deliberately arithmetic on the date parts via `Date.UTC` rather than
 * `new Date(date)` + `setDate`: the latter parses the string as UTC midnight
 * and then reads it back through the *browser's* zone, which is how this
 * project has already produced off-by-one-day bugs (see the `fix perthdate` /
 * `fix logsave by adding 1 to date` commits).
 */
export function addDaysToShiftDate(date: string, days: number): string {
  const [year, month, day] = (date || "").split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** The calendar day before a `YYYY-MM-DD` shift date. */
export function previousShiftDate(date: string): string {
  return addDaysToShiftDate(date, -1);
}

/**
 * The date a shift's work should be filed under, given the Perth wall clock
 * right now -- the value the forms write to `*_production_logs.date` and look
 * their own archive row up by.
 *
 * For a day shift this is simply today in Perth. For a night shift still
 * running after midnight it is *yesterday*, so the whole shift lands in one
 * row instead of splitting at the date rollover.
 */
export function currentShiftDate(
  shift: string | null | undefined,
  now: Date = new Date(),
): string {
  const date = perthDateOf(now);
  if (shiftGroupOf(shift) !== "night") return date;

  const minutes = minutesOfDay(perthTimeOf(now));
  if (minutes === null || minutes >= NIGHT_SHIFT_ROLLOVER_MINUTES) return date;
  return previousShiftDate(date);
}

/**
 * ISO timestamp for a Perth `HH:mm` within a shift that began on `shiftDate`.
 *
 * On a night shift the small hours are the *next* calendar day, so a cycle
 * running 23:35 -> 00:19 on the 15th's night shift stores an end timestamp on
 * the 16th. Pinning both ends to `shiftDate` (what the forms used to do) made
 * the end timestamp land *before* the start and the cycle's run duration come
 * out negative.
 *
 * Perth has no daylight saving, so the fixed `+08:00` offset is exact.
 */
export function shiftTimestamp(
  shiftDate: string,
  hhmm: string,
  shift: string | null | undefined,
): string {
  const minutes = minutesOfDay(hhmm);
  const afterMidnight =
    shiftGroupOf(shift) === "night" &&
    minutes !== null &&
    minutes < NIGHT_SHIFT_ROLLOVER_MINUTES;

  const date = afterMidnight ? addDaysToShiftDate(shiftDate, 1) : shiftDate;
  return new Date(`${date}T${hhmm}:00+08:00`).toISOString();
}

/**
 * Where a Perth `HH:mm` sits within its shift, as minutes from the shift's own
 * midnight -- the sort key for a shift's cycles.
 *
 * Plain string ordering is right for a day shift but wrong for a night one,
 * where "00:19" has to come *after* "23:35" rather than jumping to the top.
 * Unparseable times rank -1 so they stay ahead of everything, which is where
 * the previous `localeCompare("")` ordering put them.
 */
export function shiftTimeRank(
  hhmm: string | null | undefined,
  group: ShiftGroup,
): number {
  const minutes = minutesOfDay(hhmm);
  if (minutes === null) return -1;
  return group === "night" && minutes < NIGHT_SHIFT_ROLLOVER_MINUTES
    ? minutes + 24 * 60
    : minutes;
}

/** Sort comparator for a shift's cycles, night-aware. See shiftTimeRank. */
export function compareShiftCycles(
  a: CycleIdentity,
  b: CycleIdentity,
  group: ShiftGroup,
): number {
  return (
    shiftTimeRank(a.start_time, group) - shiftTimeRank(b.start_time, group)
  );
}

/** A cycle as stored in the production_logs `cycles` JSON array. */
export interface ArchivedCycle {
  cycle_number?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  run_duration_seconds?: number | null;
  load_duration_seconds?: number | null;
  run_time_minutes?: number | null;
  short_mold_json?: Record<
    string,
    { good?: number; reject?: number; type?: string; position?: string | null }
  > | null;
  bubble_json?: unknown;
  notes?: string | null;
}

/**
 * Human-readable "T1: position | T3: Short Mold" summary of a cycle's
 * rejects, or "-" if none -- mirrors the formatting used by the live
 * Press Live Log Table (app/ProductionTable.tsx) so History's table view
 * reads identically to the live grid for the same cycles.
 */
export function formatShortMolds(
  cycle: Pick<ArchivedCycle, "short_mold_json">,
): string {
  const activeMolds = [1, 2, 3, 4]
    .map((id) => {
      const cell = cycle.short_mold_json?.[`table_${id}`];
      if (!cell) return null;
      if (cell.position) return `T${id}: ${cell.position}`;
      if (cell.reject) return `T${id}: Short Mold`;
      return null;
    })
    .filter((v): v is string => v !== null);
  return activeMolds.length > 0 ? activeMolds.join(" | ") : "-";
}

/**
 * The minimal shape cycleKey/mergeCycles need to identify a cycle -- shared
 * across every production line's own cycle type (Press's ArchivedCycle,
 * Bales' BalesArchivedCycle, ...) so the dedupe/merge logic has one source of
 * truth instead of a per-line copy that can drift out of sync with bugfixes.
 */
export interface CycleIdentity {
  cycle_number?: number | null;
  start_time?: string | null;
  end_time?: string | null;
}

/**
 * Identity of a single cycle within a shift. Cycle numbers restart at 1 after
 * a "Reset Shift Log", so the number alone can't distinguish a pre-reset cycle
 * from a post-reset one -- the Perth HH:mm start/end times are what make the
 * key unique across a reset.
 */
export function cycleKey(cycle: CycleIdentity): string {
  return [
    cycle.cycle_number ?? "",
    cycle.start_time ?? "",
    cycle.end_time ?? "",
  ].join("|");
}

/**
 * Union two cycle lists into the full picture of a shift, de-duplicated by
 * cycleKey with `incoming` winning on a collision (it is the fresher
 * re-aggregation from live_log), sorted into shift order.
 *
 * This is what keeps a shift's history row lossless when the shift is split
 * across terminals or interrupted by a mid-shift reset: the stored cycles the
 * live_log no longer knows about are carried forward instead of overwritten.
 *
 * `group` only affects the ordering: on a night shift the cycles logged after
 * midnight belong at the *end* of the shift, not sorted to the top by a plain
 * "00:19" < "23:35" string compare. Defaults to "day", which is the plain
 * chronological order this always had.
 */
export function mergeCycles<T extends CycleIdentity>(
  existing: unknown,
  incoming: T[],
  group: ShiftGroup = "day",
): T[] {
  const merged = new Map<string, T>();

  if (Array.isArray(existing)) {
    (existing as T[]).forEach((cycle) => {
      if (cycle && typeof cycle === "object") merged.set(cycleKey(cycle), cycle);
    });
  }
  incoming.forEach((cycle) => merged.set(cycleKey(cycle), cycle));

  return Array.from(merged.values()).sort((a, b) =>
    compareShiftCycles(a, b, group),
  );
}

/** `value` as a cycle array, or an empty one -- `cycles` is free-form JSON. */
export function asCycleArray<T extends CycleIdentity>(value: unknown): T[] {
  return Array.isArray(value)
    ? (value.filter((c) => c && typeof c === "object") as T[])
    : [];
}

/**
 * Roll a shift's cycles up into the per-table good/reject/type yields stored in
 * production_logs.table_line_output_yields.
 *
 * good/reject are already baked into each cycle's short_mold_json at submit
 * time (the "max 1 reject per table per cycle" rule -- see CLAUDE.md), so this
 * only sums them. `type` is latest-wins, which works because the cycles arrive
 * sorted by start_time.
 */
export function tableYieldsFromCycles(cycles: ArchivedCycle[]) {
  const yields: Record<string, { good: number; reject: number; type: string }> =
    {};

  [1, 2, 3, 4].forEach((tableId) => {
    const key = `table_${tableId}`;
    let good = 0;
    let reject = 0;
    let type = "—";

    cycles.forEach((cycle) => {
      const cell = cycle.short_mold_json?.[key];
      if (cell) {
        good += cell.good || 0;
        reject += cell.reject || 0;
        if (cell.type) type = cell.type;
      }
    });

    yields[key] = { good, reject, type };
  });

  return yields;
}

// ---------------------------------------------------------------------------
// Midnight spillover: folding a night shift's after-midnight tail back onto
// the shift it belongs to
// ---------------------------------------------------------------------------

/**
 * True when an archive row is not a shift of its own but the tail of the
 * *previous* day's night shift.
 *
 * The forms used to stamp `*_production_logs.date` with the Perth calendar
 * date, so a night shift that ran past midnight -- or, more often, a terminal
 * reloaded after midnight -- opened a second row on the next day holding only
 * the cycles logged in the small hours. On screen that reads as a one-cycle
 * night shift on a day nobody worked, and the real shift loses those cycles
 * from its totals.
 *
 * The test is "every entry in this row ends before the rollover hour". A night
 * shift that genuinely started on this date has evening entries (18:00, 19:00,
 * ...) and so can never qualify, no matter how few entries it has; a row whose
 * entries *all* end in the small hours can only be spillover. Entries are
 * dated by `end_time`, falling back to `start_time` for Banbury's older checks
 * which have no end (see lib/banbury-log.ts's BanburyCheckEntry).
 *
 * Note the *start* time is deliberately not tested: the cycle in the shift
 * that prompted this -- 23:35 -> 00:19 -- starts before midnight and is
 * exactly the case that has to be caught.
 */
export function isNightMidnightSpillover(
  operatorShift: string | null | undefined,
  entries: unknown,
): boolean {
  if (shiftGroupOf(operatorShift) !== "night") return false;

  const cycles = asCycleArray(entries);
  if (cycles.length === 0) return false;

  return cycles.every((cycle) => {
    const minutes = minutesOfDay(cycle.end_time || cycle.start_time);
    return minutes !== null && minutes < NIGHT_SHIFT_ROLLOVER_MINUTES;
  });
}

/** The columns every `*_production_logs` row is resolved by. */
export interface ShiftArchiveRow {
  id: number;
  date: string;
  operator_shift: string;
}

/** One shift, after duplicate rows and midnight spillover are resolved away. */
export interface ResolvedShift<T> {
  /**
   * The date the shift actually belongs to. For a spillover row folded back a
   * day this is *not* `row.date` -- render this, not the raw column.
   */
  date: string;
  group: ShiftGroup;
  row: T;
}

export interface ResolveShiftRowsOptions<T> {
  /** The row's JSON entries array -- `cycles` for Press/Bales, `checks` for Banbury. */
  entriesOf: (row: T) => unknown;
  /**
   * Combine a midnight-spillover row into the night shift that owns it.
   * Line-specific, because the totals each line archives are different --
   * see mergePressShiftRows / mergeBalesShiftRows / mergeBanburyShiftRows.
   */
  mergeSpillover: (host: T, spillover: T) => T;
}

/**
 * Resolve raw archive rows down to one entry per real shift.
 *
 * Two corrections, in order:
 *
 * 1. **Duplicates.** `*_production_logs` is meant to hold one row per (date,
 *    shift group); rows written before the DB-backed row resolution in the
 *    forms can still be duplicated. The richest row wins -- most entries,
 *    highest id breaking a tie -- which is the rule History has always used.
 * 2. **Midnight spillover.** A night row that is really the previous day's
 *    tail (see isNightMidnightSpillover) is merged into that day's night
 *    shift.
 *
 * A spillover row with no shift to merge into is left exactly where it is.
 * Its cycles say it ran in the small hours, but with no evening half on the
 * previous day there is nothing to check that against, and moving it on that
 * guess is not a decision this can make twice: a re-dated row still looks
 * like spillover, so every later pass would walk it back another day.
 * night_shift_midnight_fix.sql reports those rows for a person to judge
 * rather than moving them.
 *
 * Spillovers are folded oldest-first so that a chain of them settles in a
 * single pass. The database keeps the split rows until
 * night_shift_midnight_fix.sql is run against it; this is what stops them
 * rendering as separate shifts in the meantime.
 */
export function resolveShiftRows<T extends ShiftArchiveRow>(
  rows: T[],
  { entriesOf, mergeSpillover }: ResolveShiftRowsOptions<T>,
): ResolvedShift<T>[] {
  const entryCount = (row: T) => asCycleArray(entriesOf(row)).length;

  const byShift = new Map<string, T>();
  rows.forEach((row) => {
    const key = `${row.date}|${shiftGroupOf(row.operator_shift)}`;
    const held = byShift.get(key);
    if (!held) {
      byShift.set(key, row);
      return;
    }

    const heldCount = entryCount(held);
    const rowCount = entryCount(row);
    if (rowCount > heldCount || (rowCount === heldCount && row.id > held.id)) {
      byShift.set(key, row);
    }
  });

  const resolved = new Map<string, ResolvedShift<T>>();
  const spillovers: T[] = [];

  byShift.forEach((row) => {
    if (isNightMidnightSpillover(row.operator_shift, entriesOf(row))) {
      spillovers.push(row);
      return;
    }
    const group = shiftGroupOf(row.operator_shift);
    resolved.set(`${row.date}|${group}`, { date: row.date, group, row });
  });

  spillovers.sort((a, b) => a.date.localeCompare(b.date));
  spillovers.forEach((row) => {
    const key = `${previousShiftDate(row.date)}|night`;
    const host = resolved.get(key);

    if (host) {
      resolved.set(key, { ...host, row: mergeSpillover(host.row, row) });
      return;
    }
    resolved.set(`${row.date}|night`, {
      date: row.date,
      group: "night",
      row,
    });
  });

  return Array.from(resolved.values());
}

/** The per-table yields shape stored on `production_logs`. */
export type TableYields = Record<
  string,
  { type?: string; good?: number; reject?: number }
>;

/** The production_logs columns a spillover fold has to combine. */
export interface PressShiftRow {
  cycles?: unknown;
  table_line_output_yields?: TableYields | null;
  total_mats_produced?: number | null;
  faulty_mats_produced?: number | null;
}

/** Add two rows' stored per-table yields together, latest mat type winning. */
function addTableYields(a: TableYields | null | undefined, b: TableYields | null | undefined) {
  const yields: Record<string, { good: number; reject: number; type: string }> =
    {};

  [1, 2, 3, 4].forEach((tableId) => {
    const key = `table_${tableId}`;
    const left = a?.[key];
    const right = b?.[key];
    yields[key] = {
      good: (left?.good || 0) + (right?.good || 0),
      reject: (left?.reject || 0) + (right?.reject || 0),
      type: right?.type || left?.type || "—",
    };
  });

  return yields;
}

/**
 * Fold a Press midnight-spillover row into the night shift that owns it.
 *
 * Cycles merge by cycleKey, so a spillover row that re-archived the whole
 * shift (its live_log was never cleared at midnight) contributes no
 * duplicates. The yields follow from that:
 *
 * - every merged cycle carries `short_mold_json` -> recompute from the cycles,
 *   which is what the write path itself does and is immune to that overlap;
 * - otherwise the rows' stored yields are added, but only when the merge found
 *   no overlap at all. Rows backfilled by migrate.js have `cycles` without
 *   `short_mold_json`, so their stored figures are the only record -- and an
 *   overlapping row already counts the host's cycles, so adding would
 *   double them and the fuller row's own figures are the better answer.
 */
export function mergePressShiftRows<T extends PressShiftRow>(
  host: T,
  spillover: T,
): T {
  const hostCycles = asCycleArray<ArchivedCycle>(host.cycles);
  const tailCycles = asCycleArray<ArchivedCycle>(spillover.cycles);
  const cycles = mergeCycles<ArchivedCycle>(hostCycles, tailCycles, "night");

  const carriesYields = cycles.every(
    (cycle) =>
      cycle.short_mold_json &&
      Object.keys(cycle.short_mold_json).length > 0,
  );
  const disjoint = cycles.length === hostCycles.length + tailCycles.length;
  const richer = tailCycles.length > hostCycles.length ? spillover : host;

  if (carriesYields) {
    const tableYields = tableYieldsFromCycles(cycles);
    const totals = Object.values(tableYields);
    return {
      ...host,
      cycles,
      table_line_output_yields: tableYields,
      total_mats_produced: totals.reduce((sum, t) => sum + t.good, 0),
      faulty_mats_produced: totals.reduce((sum, t) => sum + t.reject, 0),
    };
  }

  return {
    ...host,
    cycles,
    table_line_output_yields: disjoint
      ? addTableYields(
          host.table_line_output_yields,
          spillover.table_line_output_yields,
        )
      : richer.table_line_output_yields,
    total_mats_produced: disjoint
      ? (host.total_mats_produced || 0) + (spillover.total_mats_produced || 0)
      : richer.total_mats_produced,
    faulty_mats_produced: disjoint
      ? (host.faulty_mats_produced || 0) + (spillover.faulty_mats_produced || 0)
      : richer.faulty_mats_produced,
  };
}
