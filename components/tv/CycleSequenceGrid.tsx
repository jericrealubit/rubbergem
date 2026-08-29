"use client";

import type { LiveLogRow } from "./types";

interface CycleSequenceGridProps {
  liveLogRows: LiveLogRow[];
  periodLabel?: string;
}

export default function CycleSequenceGrid({
  liveLogRows,
  periodLabel = "This Shift",
}: CycleSequenceGridProps) {
  // Newest cycle first — combined with flex-row-reverse below, this keeps
  // the most recent cycle visible and clips older ones off the left edge
  // when there isn't room, with no width measurement/JS needed.
  const newestFirst = [...liveLogRows].reverse();

  return (
    <div className="flex-[2] min-h-0 bg-neutral-900 rounded-xl border border-neutral-800 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Cycle-by-Cycle Sequence — {periodLabel}
        </h2>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Good
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> Reject
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
        {([1, 2, 3, 4] as const).map((id) => (
          <div key={id} className="flex-1 flex items-center gap-2 min-h-0">
            <span className="w-14 shrink-0 text-[11px] font-bold text-neutral-400">
              Table {id}
            </span>
            <div className="flex-1 h-full flex flex-row-reverse gap-1 overflow-hidden">
              {newestFirst.map((row) => {
                const reject = row.short_mold_json?.[`table_${id}`]?.reject === 1;
                return (
                  <div
                    key={row.live_id}
                    className={`w-5 h-full min-h-4 rounded-sm shrink-0 ${
                      reject ? "bg-red-600" : "bg-emerald-600"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
