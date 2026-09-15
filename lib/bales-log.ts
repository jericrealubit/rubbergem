// Shared shift-identity + cycle-merge helpers for the bales_production_logs
// archive, parallel to lib/shift-log.ts for Press. shiftGroupOf/cycleKey/
// mergeCycles are line-agnostic and re-exported directly from there rather
// than duplicated -- see lib/shift-log.ts's CycleIdentity generic.

export {
  shiftGroupOf,
  cycleKey,
  mergeCycles,
  asCycleArray,
  describeError,
  currentShiftDate,
  shiftTimestamp,
  shiftTimeRank,
  compareShiftCycles,
  isNightMidnightSpillover,
  resolveShiftRows,
} from "./shift-log";
export type { ShiftGroup, ResolvedShift, ShiftArchiveRow } from "./shift-log";

import { asCycleArray, mergeCycles } from "./shift-log";

/** A cycle as stored in the bales_production_logs `cycles` JSON array. */
export interface BalesArchivedCycle {
  cycle_number?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  run_time_minutes?: number | null;
  bales_produced?: number | null;
  bale_type?: string | null;
  faulty_bales_count?: number | null;
  mesh_type?: string | null;
  notes?: string | null;
}

/**
 * Roll a shift's cycles up into the aggregate totals stored on
 * bales_production_logs. Straight sums -- Bales has no good/reject split or
 * per-table concept, so this is not tableYieldsFromCycles's rollup shape.
 */
export function balesTotalsFromCycles(cycles: BalesArchivedCycle[]) {
  return {
    total_bales_produced: cycles.reduce(
      (sum, c) => sum + (c.bales_produced || 0),
      0,
    ),
    total_faulty_bales: cycles.reduce(
      (sum, c) => sum + (c.faulty_bales_count || 0),
      0,
    ),
    total_run_time_minutes: cycles.reduce(
      (sum, c) => sum + (c.run_time_minutes || 0),
      0,
    ),
  };
}

/** The bales_production_logs columns a spillover fold has to combine. */
export interface BalesShiftRow {
  cycles?: unknown;
  total_bales_produced?: number | null;
  total_faulty_bales?: number | null;
  total_run_time_minutes?: number | null;
  main_issues_faults?: string | null;
}

/**
 * Fold a Bales midnight-spillover row into the night shift that owns it --
 * the Bales counterpart of mergePressShiftRows (see lib/shift-log.ts).
 *
 * The totals are recomputed from the merged cycles rather than added, exactly
 * as BalesForm's own write path does: every Bales cycle carries its own
 * counts (this table has never been backfilled from a legacy file), so
 * recomputing is both correct and immune to a spillover row that re-archived
 * cycles the host row already holds.
 *
 * The shift's free-text `main_issues_faults` is kept from both halves -- it is
 * the operator's note about the shift, and the half written after midnight is
 * no less part of it.
 */
export function mergeBalesShiftRows<T extends BalesShiftRow>(
  host: T,
  spillover: T,
): T {
  const cycles = mergeCycles<BalesArchivedCycle>(
    asCycleArray<BalesArchivedCycle>(host.cycles),
    asCycleArray<BalesArchivedCycle>(spillover.cycles),
    "night",
  );

  const issues = [host.main_issues_faults, spillover.main_issues_faults]
    .map((note) => (note || "").trim())
    .filter((note, index, all) => note && all.indexOf(note) === index);

  return {
    ...host,
    cycles,
    ...balesTotalsFromCycles(cycles),
    main_issues_faults: issues.length > 0 ? issues.join(" | ") : null,
  };
}
