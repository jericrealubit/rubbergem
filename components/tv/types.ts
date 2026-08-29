// Shape of a raw `live_log` row as read directly from Supabase (shift_id=1),
// as written by components/PressForm.tsx's submitCycle.

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

// One archived shift entry for the TV's history dropdown — derived from a
// deduped production_logs row (see app/tv/page.tsx).
import type { ArchivedCycle, ShiftGroup } from "@/lib/shift-log";

export interface ShiftHistoryOption {
  id: number;
  date: string;
  shiftGroup: ShiftGroup;
  operator: string;
  machinePress: string | null;
  cycles: ArchivedCycle[];
  matTypes: Record<number, string>;
}
