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
] as const;
type Position = (typeof POSITIONS)[number];

const BUBBLE_SIDES = ["left", "middle", "right"] as const;
type BubbleSide = (typeof BUBBLE_SIDES)[number];

interface TableDefectTally {
  positions: Record<Position, number>;
  bubbles: Record<BubbleSide, number>;
}

function emptyTally(): TableDefectTally {
  return {
    positions: {
      "top-left": 0,
      "top-right": 0,
      center: 0,
      "bottom-left": 0,
      "bottom-right": 0,
    },
    bubbles: { left: 0, middle: 0, right: 0 },
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

      const checks = row.bubble_json?.checks?.[id];
      if (checks) {
        BUBBLE_SIDES.forEach((side) => {
          if (checks[side]) tallies[id].bubbles[side] += 1;
        });
      }
    });
  });

  return tallies;
}

function PositionCell({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  return (
    <div
      className={`w-11 h-11 rounded flex items-center justify-center text-sm font-mono font-bold text-neutral-100 ${countToRedBucket(count)} ${className}`}
    >
      {count}
    </div>
  );
}

interface DefectLocationHeatmapProps {
  liveLogRows: LiveLogRow[];
  matTypes?: Record<number, string>;
}

export default function DefectLocationHeatmap({
  liveLogRows,
  matTypes,
}: DefectLocationHeatmapProps) {
  const tallies = useMemo(() => tallyDefectLocations(liveLogRows), [liveLogRows]);

  return (
    <div className="flex-[3] min-h-0 bg-neutral-900 rounded-xl border border-neutral-800 p-3 flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
        Defect Location Heatmap — This Shift
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

              <div className="grid grid-cols-2 grid-rows-3 gap-1">
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

              <div className="grid grid-cols-3 gap-1 w-full">
                {BUBBLE_SIDES.map((side) => (
                  <div
                    key={side}
                    className={`h-8 rounded flex items-center justify-center text-xs font-mono font-bold text-neutral-100 ${countToRedBucket(tally.bubbles[side])}`}
                  >
                    {tally.bubbles[side]}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
