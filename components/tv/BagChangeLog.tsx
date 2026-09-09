"use client";

import type { BagChangeRow } from "./types";

/**
 * The live shift's East/West bag changes — the wallboard mirror of
 * BalesProductionTable's bag-change mini-log, newest first.
 *
 * bales_bag_changes is a live-shift-only event log (it is cleared by
 * reset_bales_shift_log and never copied into bales_production_logs), so a
 * viewer replaying an archived shift is told the log isn't archived rather
 * than shown the current shift's swaps under a past shift's heading.
 */
interface BagChangeLogProps {
  rows: BagChangeRow[];
  isHistory: boolean;
  className?: string;
}

const SIDES = ["east", "west"] as const;

function perthTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Australia/Perth",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function BagChangeLog({
  rows,
  isHistory,
  className = "flex-[2]",
}: BagChangeLogProps) {
  return (
    <div
      className={`${className} min-h-0 bg-card rounded-xl border border-border p-3 flex flex-col gap-2`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Bag Changes{isHistory ? "" : " — This Shift"}
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {isHistory ? "Live shift only" : `${rows.length} logged`}
        </span>
      </div>

      {isHistory ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
          Bag changes are logged per live shift and aren&apos;t archived to
          history.
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-2 justify-start overflow-hidden">
          {SIDES.map((side) => {
            const sideRows = rows
              .filter((row) => row.side?.toLowerCase() === side)
              .sort((a, b) => b.sequence_number - a.sequence_number);

            return (
              <div key={side} className="h-10 shrink-0 flex items-center gap-2">
                <span className="w-14 shrink-0 text-[11px] font-bold uppercase text-muted-foreground">
                  {side}
                </span>
                <div className="flex-1 h-full flex gap-1.5 overflow-hidden items-center">
                  {sideRows.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      No changes logged
                    </span>
                  ) : (
                    sideRows.map((row) => (
                      <div
                        key={row.id}
                        className="shrink-0 px-2 py-1 rounded-md bg-muted border border-border flex items-baseline gap-1.5"
                        title={`${side} bag #${row.sequence_number} — ${
                          row.weight_kg ?? "—"
                        } kg at ${perthTime(row.logged_at)}`}
                      >
                        <span className="text-[11px] font-mono font-bold text-foreground">
                          #{row.sequence_number}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {row.weight_kg ?? "—"}kg
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {perthTime(row.logged_at)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
