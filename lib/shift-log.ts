// Shared shift-identity + cycle-merge helpers for the production_logs archive.
//
// production_logs holds one row per shift per day, but the table has no
// shift_group column -- the shift is embedded in the free-text operator_shift
// value as `${operator} (${shift})`. Both the write path
// (components/PressForm.tsx) and the read path
// (components/ProductionHistory.tsx) have to derive the shift group from that
// string, and they have to agree, so the derivation lives here once.

export type ShiftGroup = "day" | "night";

/**
 * Derive the shift group from a production_logs `operator_shift` value
 * (e.g. "Jeric (night)"). Anything that isn't recognisably a night shift is
 * treated as a day shift, matching how History has always read these rows.
 */
export function shiftGroupOf(operatorShift: string | null | undefined): ShiftGroup {
  return (operatorShift || "").toLowerCase().includes("night") ? "night" : "day";
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
 * re-aggregation from live_log), sorted by start_time.
 *
 * This is what keeps a shift's history row lossless when the shift is split
 * across terminals or interrupted by a mid-shift reset: the stored cycles the
 * live_log no longer knows about are carried forward instead of overwritten.
 */
export function mergeCycles<T extends CycleIdentity>(
  existing: unknown,
  incoming: T[],
): T[] {
  const merged = new Map<string, T>();

  if (Array.isArray(existing)) {
    (existing as T[]).forEach((cycle) => {
      if (cycle && typeof cycle === "object") merged.set(cycleKey(cycle), cycle);
    });
  }
  incoming.forEach((cycle) => merged.set(cycleKey(cycle), cycle));

  return Array.from(merged.values()).sort((a, b) =>
    (a.start_time || "").localeCompare(b.start_time || ""),
  );
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
