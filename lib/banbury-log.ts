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

export { shiftGroupOf, cycleKey, mergeCycles, describeError } from "./shift-log";
export type { ShiftGroup, CycleIdentity } from "./shift-log";

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
