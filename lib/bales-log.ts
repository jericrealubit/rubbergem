// Shared shift-identity + cycle-merge helpers for the bales_production_logs
// archive, parallel to lib/shift-log.ts for Press. shiftGroupOf/cycleKey/
// mergeCycles are line-agnostic and re-exported directly from there rather
// than duplicated -- see lib/shift-log.ts's CycleIdentity generic.

export { shiftGroupOf, cycleKey, mergeCycles } from "./shift-log";
export type { ShiftGroup } from "./shift-log";

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
