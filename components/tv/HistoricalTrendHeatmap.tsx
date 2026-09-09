"use client";

import { shiftGroupOf, type ShiftGroup } from "@/lib/shift-log";
import { perthDate, useShiftArchive, type ArchiveRow } from "./use-tv-data";

const DAYS_BACK = 14;

/** How one day/shift slot renders — the panel decides what "worse" means. */
export interface TrendCell {
  /** Bucket class from lib/heatmap-color (the shared single-hue ramp). */
  className: string;
  /** Short in-cell figure, e.g. "4%" or "12m". Empty for a shift with no row. */
  text: string;
  /** Tooltip / screen-reader description of the value. */
  title?: string;
}

interface HistoricalTrendHeatmapProps<T extends ArchiveRow> {
  title: string;
  /** `*_production_logs` table for this line. */
  table: string;
  columns: string;
  channel: string;
  /** JSONB array column measuring a row's richness: "cycles" or "checks". */
  entriesColumn: string;
  /** Render one slot; `row` is undefined when no shift ran that day/shift. */
  cellFor: (row: T | undefined) => TrendCell;
}

/**
 * The 14-day day/night grid down the right of every line's wallboard.
 *
 * Press reads it as a reject rate, Bales as a faulty-bale rate and Banbury as
 * lost minutes, so the severity mapping is the caller's — this component owns
 * the fetch, the one-row-per-(date, shift group) dedupe and the grid.
 */
export default function HistoricalTrendHeatmap<T extends ArchiveRow>({
  title,
  table,
  columns,
  channel,
  entriesColumn,
  cellFor,
}: HistoricalTrendHeatmapProps<T>) {
  const cutoff = perthDate(DAYS_BACK);
  const rows = useShiftArchive<T>(table, columns, channel, entriesColumn, cutoff);

  const byDateShift = new Map<string, T>();
  rows.forEach((row) => {
    byDateShift.set(`${row.date}|${shiftGroupOf(row.operator_shift)}`, row);
  });

  const dates: string[] = [];
  for (let i = 0; i <= DAYS_BACK; i++) dates.push(perthDate(i)); // newest first

  return (
    <div className="h-full min-h-0 bg-card rounded-xl border border-border p-3 flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {title} — Last {DAYS_BACK} Days
      </h2>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground pb-1">
        <span />
        <span>Day</span>
        <span>Night</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
        {dates.map((date) => (
          <div
            key={date}
            className="flex-1 grid grid-cols-[auto_1fr_1fr] gap-1 items-center"
          >
            <span className="text-[10px] font-mono text-muted-foreground pr-1">
              {date.slice(5)}
            </span>
            {(["day", "night"] as ShiftGroup[]).map((shift) => {
              const cell = cellFor(byDateShift.get(`${date}|${shift}`));
              return (
                <div
                  key={shift}
                  title={cell.title}
                  className={`h-full rounded flex items-center justify-center text-[10px] font-mono font-bold text-foreground ${cell.className}`}
                >
                  {cell.text}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
