"use client";

/**
 * Both Banbury tank levels, latest reading large with the previous few
 * trailing behind it.
 *
 * The values are free text on purpose — the paper form records either a
 * number ("302") or the word "Full" in the same cell, and
 * banbury_live_log.right_tank_level/left_tank_level keep that as TEXT — so
 * this panel shows them verbatim rather than trying to chart them.
 */

export interface TankReading {
  leftTank: string;
  rightTank: string;
}

function Tank({
  side,
  readings,
}: {
  side: string;
  readings: string[];
}) {
  const [latest, ...trail] = readings;
  return (
    <div className="flex-1 min-w-0 bg-muted/50 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {side} Tank
      </span>
      <span className="text-4xl font-bold font-sans text-foreground truncate max-w-full">
        {latest || "—"}
      </span>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {trail.slice(0, 4).map((value, i) => (
          <span
            key={`${value}-${i}`}
            className="text-[10px] font-mono text-muted-foreground px-1 rounded bg-card border border-border"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BanburyTankLevels({
  checks,
  className = "h-full",
}: {
  /** Shift order, oldest first — the latest reading is taken from the end. */
  checks: TankReading[];
  className?: string;
}) {
  const trailOf = (side: keyof TankReading) =>
    [...checks]
      .reverse()
      .map((check) => check[side])
      .filter((value) => !!value);

  return (
    <div
      className={`${className} min-h-0 bg-card rounded-xl border border-border p-3 flex flex-col gap-2`}
    >
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Tank Levels — Latest
      </h2>
      <div className="flex-1 min-h-0 flex gap-2">
        <Tank side="Left" readings={trailOf("leftTank")} />
        <Tank side="Right" readings={trailOf("rightTank")} />
      </div>
    </div>
  );
}
