// Row/option shapes for the /tv wallboard.
//
// The wallboard reads all three production lines, so this file carries three
// families of types: the raw `*_live_log` row as read from Supabase, and the
// deduped `*_production_logs` entry behind each line's shift-history picker.
// Each panel normalises both into one display shape (see the panel files) so
// the same widgets render a live shift and an archived one unchanged.

import type { ArchivedCycle, ShiftGroup } from "@/lib/shift-log";
import type { BalesArchivedCycle } from "@/lib/bales-log";
import type { BanburyCheckEntry } from "@/lib/banbury-log";

/** The three production lines the wallboard can show, one at a time. */
export type TvLine = "press" | "bales" | "banbury";

export const TV_LINES: { id: TvLine; label: string }[] = [
  { id: "press", label: "Press" },
  { id: "bales", label: "Bales" },
  { id: "banbury", label: "Banbury" },
];

/** Wallboard headline per line — used as the header title. */
export const TV_LINE_TITLES: Record<TvLine, string> = {
  press: "Press Floor",
  bales: "Bales Line",
  banbury: "Banbury Line",
};

// --- Press ------------------------------------------------------------

export type TableKey = "table_1" | "table_2" | "table_3" | "table_4";

export interface TableYieldCell {
  good?: number;
  reject?: number;
  type?: string;
  position?: string | null;
}

export interface BubbleSideChecks {
  left?: boolean;
  middle?: boolean;
  right?: boolean;
}

/** A raw `live_log` row (shift_id=1), as written by PressForm's submitCycle. */
export interface LiveLogRow {
  live_id: number;
  cycle_number: number | null;
  start_time: string | null;
  end_time: string | null;
  short_mold_json: Partial<Record<TableKey, TableYieldCell>> | null;
  bubble_json: {
    checks?: Partial<Record<number, BubbleSideChecks>>;
    sizes?: Partial<Record<number, string>>;
  } | null;
}

// --- Bales ------------------------------------------------------------

/** A raw `bales_live_log` row, as written by BalesForm's submit. */
export interface BalesLiveLogRow {
  bales_id: number;
  cycle_number: number | null;
  start_time: string | null;
  end_time: string | null;
  run_time_minutes: number | null;
  bales_produced: number | null;
  bale_type: string | null;
  faulty_bales_count: number | null;
  mesh_type: string | null;
}

/** A raw `bales_bag_changes` row — the live shift's East/West bag swaps. */
export interface BagChangeRow {
  id: number;
  side: string;
  sequence_number: number;
  weight_kg: number | null;
  logged_at: string;
}

// --- Banbury ----------------------------------------------------------

/** A raw `banbury_live_log` row, as written by BanburyForm's submit. */
export interface BanburyLiveLogRow {
  banbury_id: number;
  check_number: number | null;
  start_time: string | null;
  check_time: string | null;
  run_time_minutes: number | null;
  crumb_rubber: boolean | null;
  other_rubbers: boolean | null;
  powdered_chemicals: boolean | null;
  rpo: boolean | null;
  sulphur: boolean | null;
  liquid_chemicals: boolean | null;
  right_tank_level: string | null;
  left_tank_level: string | null;
}

// --- Shift-history picker ---------------------------------------------

/**
 * What TvHeader's shift picker needs from any line's archived shift. Each
 * line extends it with the payload its own panel replays (Press cycles,
 * Bales cycles, Banbury checks).
 */
export interface ShiftPickerOption {
  id: number;
  date: string;
  shiftGroup: ShiftGroup;
  operator: string;
}

export interface ShiftHistoryOption extends ShiftPickerOption {
  machinePress: string | null;
  cycles: ArchivedCycle[];
  matTypes: Record<number, string>;
}

export interface BalesShiftHistoryOption extends ShiftPickerOption {
  cycles: BalesArchivedCycle[];
  meshType: string;
}

export interface BanburyShiftHistoryOption extends ShiftPickerOption {
  checks: BanburyCheckEntry[];
  product: string;
  batchesMade: number;
  bagsCount: number;
  tonnes: number;
  runTimeMinutes: number;
  averageOutputPH: number;
}
