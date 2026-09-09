"use client";

import TvSequenceGrid, { type SequenceRow } from "./TvSequenceGrid";
import type { LiveLogRow } from "./types";

interface CycleSequenceGridProps {
  liveLogRows: LiveLogRow[];
  periodLabel?: string;
}

/**
 * Press's four-table cycle strip — one row per table, one cell per cycle,
 * red where that table rejected. Layout/tone handling lives in the shared
 * TvSequenceGrid so Bales and Banbury read identically.
 */
export default function CycleSequenceGrid({
  liveLogRows,
  periodLabel = "This Shift",
}: CycleSequenceGridProps) {
  const rows: SequenceRow[] = ([1, 2, 3, 4] as const).map((id) => ({
    label: `Table ${id}`,
    cells: liveLogRows.map((row) => {
      const reject = row.short_mold_json?.[`table_${id}`]?.reject === 1;
      return {
        key: row.live_id,
        tone: reject ? ("bad" as const) : ("good" as const),
        title: `Cycle ${row.cycle_number ?? "—"} — Table ${id} — ${reject ? "Reject" : "Good"}`,
      };
    }),
  }));

  return (
    <TvSequenceGrid
      title={`Cycle-by-Cycle Sequence — ${periodLabel}`}
      rows={rows}
      legend={[
        { tone: "good", label: "Good" },
        { tone: "bad", label: "Reject" },
      ]}
    />
  );
}
