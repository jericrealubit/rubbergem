"use client";

/**
 * Bales output, cycle by cycle — the line's equivalent of the Press defect
 * heatmap: the panel a viewer reads first.
 *
 * One bar per cycle, height = bales produced, split into the good bales and
 * the faulty ones logged against that cycle. Good/faulty are *status*
 * colours (the same red that means "reject" everywhere else on the
 * wallboard), never series identity, and the legend names both so the split
 * is never carried by colour alone.
 *
 * Labels are selective on purpose — the tallest cycle and the newest one —
 * so the wall reads at a glance instead of becoming a wall of numbers; every
 * bar still carries its full figures in a hover title.
 */

export interface BalesChartCycle {
  key: string | number;
  cycleNumber: number;
  balesProduced: number;
  faultyBales: number;
}

interface BalesOutputChartProps {
  cycles: BalesChartCycle[];
  periodLabel: string;
  className?: string;
}

export default function BalesOutputChart({
  cycles,
  periodLabel,
  className = "flex-[3]",
}: BalesOutputChartProps) {
  const max = cycles.reduce((m, c) => Math.max(m, c.balesProduced), 0);
  const peakIndex = cycles.findIndex((c) => c.balesProduced === max && max > 0);

  return (
    <div
      className={`${className} min-h-0 bg-card rounded-xl border border-border p-3 flex flex-col gap-2`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Bales per Cycle — {periodLabel}
        </h2>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-muted-foreground">
          <span>Peak {max || 0}</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-success" /> Good
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive" /> Faulty
          </span>
        </div>
      </div>

      {cycles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          No cycles logged yet
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-stretch gap-1 border-b border-border pb-0">
          {cycles.map((cycle, index) => {
            const produced = Math.max(0, cycle.balesProduced);
            const faulty = Math.min(Math.max(0, cycle.faultyBales), produced);
            const good = produced - faulty;
            const heightPct = max > 0 ? (produced / max) * 100 : 0;
            const faultyShare = produced > 0 ? (faulty / produced) * 100 : 0;
            const labelled = index === peakIndex || index === cycles.length - 1;

            return (
              <div
                key={cycle.key}
                className="flex-1 min-w-0 flex flex-col justify-end items-center gap-1"
                title={`Cycle ${cycle.cycleNumber} — ${good} good, ${faulty} faulty of ${produced} bales`}
              >
                {labelled && produced > 0 && (
                  <span className="text-[10px] font-mono font-bold text-foreground">
                    {produced}
                  </span>
                )}
                {/* Capped width: a shift of a dozen cycles would otherwise
                    draw slabs half a screen wide, which reads loud rather
                    than legible from across the floor. */}
                <div
                  className="w-full max-w-[44px] flex flex-col justify-end gap-[2px]"
                  style={{ height: `${Math.max(heightPct, produced > 0 ? 4 : 1)}%` }}
                >
                  {faulty > 0 && (
                    <div
                      className="w-full bg-destructive rounded-t"
                      style={{ height: `${faultyShare}%` }}
                    />
                  )}
                  <div
                    className={`w-full flex-1 ${
                      produced > 0 ? "bg-success" : "bg-muted"
                    } ${faulty > 0 ? "" : "rounded-t"}`}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {cycle.cycleNumber}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
