"use client";

import { useMemo } from "react";
import { countToAmberBucket, countToRedBucket } from "@/lib/heatmap-color";
import { B_GRADE_POSITION } from "@/lib/shift-log";
import type { LiveLogRow } from "./types";

// Every value a cycle's `position` can hold -- the 5 grid positions plus the
// two defect grades, which are not places on the table but are tallied here
// all the same: they are rejects the wallboard's KPI row counts, so leaving
// them out would show a reject total with nothing under it to explain it.
const POSITIONS = [
  "top-left",
  "top-right",
  "center",
  "bottom-left",
  "bottom-right",
  "bubble",
  B_GRADE_POSITION,
] as const;
type Position = (typeof POSITIONS)[number];

interface TableDefectTally {
  positions: Record<Position, number>;
}

function emptyTally(): TableDefectTally {
  return {
    positions: {
      "top-left": 0,
      "top-right": 0,
      center: 0,
      "bottom-left": 0,
      "bottom-right": 0,
      bubble: 0,
      [B_GRADE_POSITION]: 0,
    },
  };
}

function tallyDefectLocations(
  rows: LiveLogRow[],
): Record<1 | 2 | 3 | 4, TableDefectTally> {
  const tallies: Record<1 | 2 | 3 | 4, TableDefectTally> = {
    1: emptyTally(),
    2: emptyTally(),
    3: emptyTally(),
    4: emptyTally(),
  };

  rows.forEach((row) => {
    ([1, 2, 3, 4] as const).forEach((id) => {
      const cell = row.short_mold_json?.[`table_${id}`];
      const position = cell?.position;
      if (position && (POSITIONS as readonly string[]).includes(position)) {
        tallies[id].positions[position as Position] += 1;
      }
    });
  });

  return tallies;
}

function PositionCell({
  count,
  label,
  className = "",
  bucket = countToRedBucket,
}: {
  count: number;
  label?: string;
  className?: string;
  /**
   * Magnitude ramp for this cell. Defaults to the red one every other cell
   * uses; B-grade passes countToAmberBucket, which shares its thresholds.
   */
  bucket?: (count: number) => string;
}) {
  return (
    <div
      className={`w-11 h-11 rounded flex items-center justify-center gap-1 text-sm font-mono font-bold text-foreground ${bucket(count)} ${className}`}
    >
      {label && (
        <span className="text-[9px] font-sans font-bold uppercase tracking-wide">
          {label}
        </span>
      )}
      {count}
    </div>
  );
}

interface DefectLocationHeatmapProps {
  liveLogRows: LiveLogRow[];
  matTypes?: Record<number, string>;
  periodLabel?: string;
}

export default function DefectLocationHeatmap({
  liveLogRows,
  matTypes,
  periodLabel = "This Shift",
}: DefectLocationHeatmapProps) {
  const tallies = useMemo(() => tallyDefectLocations(liveLogRows), [liveLogRows]);

  return (
    <div className="flex-[3] min-h-0 bg-card rounded-xl border border-border p-3 flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Defect Location Heatmap — {periodLabel}
      </h2>
      <div className="flex-1 grid grid-cols-4 gap-3">
        {([1, 2, 3, 4] as const).map((id) => {
          const tally = tallies[id];
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-2 bg-muted/50 rounded-lg p-2"
            >
              <span className="text-[11px] font-bold uppercase text-muted-foreground">
                Table {id}
                {matTypes?.[id] ? ` · ${matTypes[id]}` : ""}
              </span>

              <div className="flex flex-col items-center gap-1.5 w-full">
                <div className="grid grid-cols-[auto_auto] grid-rows-3 gap-1 justify-center">
                  <PositionCell
                    count={tally.positions["top-left"]}
                    className="col-start-1 row-start-1"
                  />
                  <PositionCell
                    count={tally.positions["top-right"]}
                    className="col-start-2 row-start-1"
                  />
                  <PositionCell
                    count={tally.positions.center}
                    className="col-start-1 col-span-2 row-start-2 justify-self-center"
                  />
                  <PositionCell
                    count={tally.positions["bottom-left"]}
                    className="col-start-1 row-start-3"
                  />
                  <PositionCell
                    count={tally.positions["bottom-right"]}
                    className="col-start-2 row-start-3"
                  />
                </div>
                {/* The two defect grades sit under the position grid,
                    because neither is a place on the table -- as one row, not
                    two, so the column is no taller than it was with Bubble
                    alone: a second row overflowed the card at 1280x720, where
                    /tv's overflow-hidden clips rather than scrolls. The column
                    is ~214px wide even there, so both labels still fit.
                    B-grade is amber, as everywhere else it is counted -- on
                    the red ramp six B-grades would read as six short-molds. */}
                <div className="flex w-full gap-1.5">
                  <PositionCell
                    count={tally.positions.bubble}
                    label="Bubble"
                    className="!w-auto flex-1 h-8"
                  />
                  <PositionCell
                    count={tally.positions[B_GRADE_POSITION]}
                    label="B-Grade"
                    bucket={countToAmberBucket}
                    className="!w-auto flex-1 h-8"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
