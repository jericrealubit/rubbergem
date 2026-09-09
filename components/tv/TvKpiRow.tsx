"use client";

import type { ReactNode } from "react";

/**
 * One wallboard stat tile. `tone` is a *status* colour (the value is good or
 * bad), never a series identity — Press yield, Bales faults and Banbury
 * downtime all carry the same meaning of red, and a neutral figure such as
 * "cycles logged" stays in plain foreground ink.
 */
export interface KpiTile {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}

const TONE_CLASS: Record<NonNullable<KpiTile["tone"]>, string> = {
  neutral: "text-foreground",
  good: "text-success",
  bad: "text-destructive",
  warn: "text-warning",
};

function Tile({
  label,
  value,
  tone = "neutral",
  compact,
}: KpiTile & { compact: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 flex flex-col justify-center min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </span>
      {/* Proportional figures on purpose: tabular-nums makes a big standalone
          number look loose. Alignment only matters in columns, not here. */}
      <span
        className={`${compact ? "text-4xl" : "text-5xl"} font-bold font-sans truncate ${TONE_CLASS[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function TvKpiRow({ tiles }: { tiles: KpiTile[] }): ReactNode {
  return (
    <div
      className="h-24 shrink-0 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
    >
      {tiles.map((tile) => (
        <Tile key={tile.label} {...tile} compact={tiles.length > 4} />
      ))}
    </div>
  );
}
