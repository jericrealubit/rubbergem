// Shared shift-identity + cycle-merge helpers for the banbury_production_logs
// archive, parallel to lib/shift-log.ts / lib/bales-log.ts for Press/Bales.
// shiftGroupOf/cycleKey/mergeCycles are line-agnostic and re-exported
// directly from there rather than duplicated -- see lib/shift-log.ts's
// CycleIdentity generic.
//
// Unlike Press/Bales, there is no *TotalsFromCycles rollup here: a Banbury
// "cycle" is a point-in-time chemical/tank checklist entry with no output
// data at all (see banbury_live_log.sql) -- the shift's output totals
// (Batches Made, # Bags, Tonnes, Run Time, Average Output P/H) are scalars
// the operator maintains directly on banbury_shift_config, not derived by
// summing checklist entries.

export { shiftGroupOf, cycleKey, mergeCycles } from "./shift-log";
export type { ShiftGroup, CycleIdentity } from "./shift-log";

import type { CycleIdentity } from "./shift-log";

/**
 * A logged checklist entry, as stored in banbury_production_logs.checks.
 *
 * cycle_number = the checklist entry's sequence number ("No." on the paper
 * sheet); start_time = the single timestamp the check was logged (checks
 * have no duration, so end_time is unused) -- reusing CycleIdentity's field
 * names directly lets cycleKey/mergeCycles work unmodified.
 */
export interface BanburyCheckEntry extends CycleIdentity {
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
