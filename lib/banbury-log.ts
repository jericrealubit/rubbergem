// Shared shift-identity + cycle-merge helpers for the banbury_production_logs
// archive, parallel to lib/shift-log.ts / lib/bales-log.ts for Press/Bales.
// shiftGroupOf/cycleKey/mergeCycles are line-agnostic and re-exported
// directly from there rather than duplicated -- see lib/shift-log.ts's
// CycleIdentity generic.
//
// Unlike Press/Bales, there is no *TotalsFromCycles rollup here: a Banbury
// "cycle" is a chemical/tank checklist entry -- it spans a start and an end
// like a press cycle does, but carries no output data at all (see
// banbury_live_log.sql) -- the shift's output totals
// (Batches Made, # Bags, Tonnes, Run Time, Average Output P/H) are scalars
// the operator maintains directly on banbury_shift_config, not derived by
// summing checklist entries.

export {
  shiftGroupOf,
  cycleKey,
  mergeCycles,
  asCycleArray,
  describeError,
  isMissingColumnError,
  currentShiftDate,
  shiftTimestamp,
  shiftTimeRank,
  compareShiftCycles,
  isNightMidnightSpillover,
  resolveShiftRows,
} from "./shift-log";
export type {
  ShiftGroup,
  CycleIdentity,
  ResolvedShift,
  ShiftArchiveRow,
} from "./shift-log";

import { asCycleArray, mergeCycles } from "./shift-log";
import type { CycleIdentity } from "./shift-log";

/**
 * A logged checklist entry, as stored in banbury_production_logs.checks.
 *
 * cycle_number = the checklist entry's sequence number ("No." on the paper
 * sheet); start_time = when the check cycle was opened (TAP TO START) and
 * end_time = when it was logged, with run_time_minutes the interval between
 * them -- reusing CycleIdentity's field names directly lets
 * cycleKey/mergeCycles work unmodified.
 *
 * Entries archived before checks had a start time carry the older shape:
 * start_time = the check's own clock time and no end_time at all. Both the
 * write path (components/BanburyForm.tsx) and the read path
 * (components/BanburyHistory.tsx) preserve that shape rather than
 * reinterpreting it -- rewriting those keys would make mergeCycles append a
 * duplicate of every pre-existing entry.
 */
export interface BanburyCheckEntry extends CycleIdentity {
  run_time_minutes?: number | null;
  crumb_rubber?: boolean | null;
  other_rubbers?: boolean | null;
  powdered_chemicals?: boolean | null;
  rpo?: boolean | null;
  sulphur?: boolean | null;
  liquid_chemicals?: boolean | null;
  right_tank_level?: string | null;
  left_tank_level?: string | null;
  notes?: string | null;
}

/**
 * The Banbury's standard check-cycle length, in minutes -- the Banbury
 * equivalent of the Press's 17-minute load target
 * (DEFAULT_LOAD_TIME_MINUTES in app/ProductionTable.tsx). A check cycle is
 * expected to take 16 minutes end to end, so every minute a cycle runs past
 * that is downtime.
 *
 * The Press measures its own overrun against a *derived* figure (load time =
 * elapsed minus the shift's configured press Run Time) because a press cycle
 * has a machine cure sitting inside it. A Banbury check has no machine cycle
 * behind it, so the whole start-to-log interval
 * (banbury_live_log.run_time_minutes) is what gets measured against this
 * constant -- see BanburyForm's computeDurationMinutes.
 *
 * Defined here rather than inline per component so the live form readout
 * (components/BanburyForm.tsx), the live shift total (app/BanburyTable.tsx)
 * and the archived total (components/BanburyHistory.tsx) can't drift apart --
 * the drift the Press's three separate copies of 17 invite.
 */
export const BANBURY_DEFAULT_RUN_TIME_MINUTES = 16;

/**
 * Minutes a single check cycle overran the standard cycle, clamped at 0 --
 * a check logged early is never negative downtime, exactly as the Press's
 * `Math.max(0, loadTime - 17)`.
 *
 * Checks archived before banbury_live_log carried run_time_minutes have null
 * here and so contribute nothing.
 */
export function checkDowntimeMinutes(
  runTimeMinutes: number | string | null | undefined,
): number {
  const minutes =
    typeof runTimeMinutes === "number"
      ? runTimeMinutes
      : parseFloat(String(runTimeMinutes ?? "")) || 0;
  return Math.max(0, minutes - BANBURY_DEFAULT_RUN_TIME_MINUTES);
}

/** Did this check cycle overrun the standard cycle? The grids colour on this. */
export function isCheckOverrun(
  runTimeMinutes: number | string | null | undefined,
): boolean {
  return checkDowntimeMinutes(runTimeMinutes) > 0;
}

/** Total downtime across a shift's checks, in minutes. */
export function totalDowntimeMinutes(
  checks: readonly { run_time_minutes?: number | null }[] | null | undefined,
): number {
  if (!Array.isArray(checks)) return 0;
  return checks.reduce(
    (total, check) => total + checkDowntimeMinutes(check?.run_time_minutes),
    0,
  );
}

/** The banbury_production_logs columns a spillover fold has to combine. */
export interface BanburyShiftRow {
  checks?: unknown;
  product?: string | null;
  bag_weight_kg?: number | null;
  batches_made?: number | null;
  mesh_bags_count?: number | null;
  tonnes?: number | null;
  run_time_minutes?: number | null;
  average_output_ph?: number | null;
}

/** The later of two operator-entered values, treating 0/blank as "not entered". */
function latestEntered<V>(host: V, spillover: V): V {
  if (typeof spillover === "number") return spillover !== 0 ? spillover : host;
  return spillover ? spillover : host;
}

/**
 * Fold a Banbury midnight-spillover row into the night shift that owns it --
 * the Banbury counterpart of mergePressShiftRows (see lib/shift-log.ts).
 *
 * Only the checklist entries merge. Everything else on a Banbury row
 * (Batches Made, # Bags, Tonnes, Run Time, Average Output P/H) is a
 * shift-level scalar the operator maintains directly and the form rewrites in
 * full on every check, so the two rows hold two snapshots of the same running
 * totals, not two halves to add up -- adding them would double the shift.
 * The spillover row is the later write, so its figures win wherever the
 * operator actually entered one.
 */
export function mergeBanburyShiftRows<T extends BanburyShiftRow>(
  host: T,
  spillover: T,
): T {
  return {
    ...host,
    checks: mergeCycles<BanburyCheckEntry>(
      asCycleArray<BanburyCheckEntry>(host.checks),
      asCycleArray<BanburyCheckEntry>(spillover.checks),
      "night",
    ),
    product: latestEntered(host.product, spillover.product),
    bag_weight_kg: latestEntered(host.bag_weight_kg, spillover.bag_weight_kg),
    batches_made: latestEntered(host.batches_made, spillover.batches_made),
    mesh_bags_count: latestEntered(
      host.mesh_bags_count,
      spillover.mesh_bags_count,
    ),
    tonnes: latestEntered(host.tonnes, spillover.tonnes),
    run_time_minutes: latestEntered(
      host.run_time_minutes,
      spillover.run_time_minutes,
    ),
    average_output_ph: latestEntered(
      host.average_output_ph,
      spillover.average_output_ph,
    ),
  };
}
