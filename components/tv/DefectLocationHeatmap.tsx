"use client";

import { useMemo } from "react";
import { countToRedBucket } from "@/lib/heatmap-color";
import type { LiveLogRow } from "./types";

const POSITIONS = [
  "top-left",
  "top-right",
  "center",
  "bottom-left",
  "bottom-right",
  "bubble",
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
}: {
  count: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`w-11 h-11 rounded flex items-center justify-center gap-1 text-sm font-mono font-bold text-neutral-100 ${countToRedBucket(count)} ${className}`}
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
    <div className="flex-[3] min-h-0 bg-neutral-900 rounded-xl border border-neutral-800 p-3 flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
        Defect Location Heatmap — {periodLabel}
      </h2>
      <div className="flex-1 grid grid-cols-4 gap-3">
        {([1, 2, 3, 4] as const).map((id) => {
          const tally = tallies[id];
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-2 bg-neutral-950/50 rounded-lg p-2"
            >
              <span className="text-[11px] font-bold uppercase text-neutral-400">
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
                <PositionCell
                  count={tally.positions.bubble}
                  label="Bubble"
                  className="!w-full h-8"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
