"use client";

import { useMemo } from "react";
import { tableYieldsFromCycles } from "@/lib/shift-log";
import type { LiveLogRow } from "./types";

interface TvKpiRowProps {
  liveLogRows: LiveLogRow[];
}

function Tile({
  label,
  value,
  valueClassName = "text-neutral-50",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 flex flex-col justify-center">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className={`text-5xl font-bold font-sans ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

export default function TvKpiRow({ liveLogRows }: TvKpiRowProps) {
  const { totalCycles, totalMats, totalRejects, yieldPct } = useMemo(() => {
    const yields = tableYieldsFromCycles(liveLogRows as any);
    let rejects = 0;
    Object.values(yields).forEach((y) => {
      rejects += y.reject;
    });
    const cycles = liveLogRows.length;
    const mats = cycles * 4;
    return {
      totalCycles: cycles,
      totalMats: mats,
      totalRejects: rejects,
      yieldPct: mats > 0 ? ((mats - rejects) / mats) * 100 : 0,
    };
  }, [liveLogRows]);

  return (
    <div className="h-24 shrink-0 grid grid-cols-4 gap-3">
      <Tile label="Total Cycles" value={String(totalCycles)} />
      <Tile label="Mats Produced" value={String(totalMats)} />
      <Tile
        label="Rejects"
        value={String(totalRejects)}
        valueClassName={totalRejects > 0 ? "text-red-500" : "text-neutral-50"}
      />
      <Tile
        label="Yield"
        value={`${yieldPct.toFixed(1)}%`}
        valueClassName={yieldPct >= 95 ? "text-emerald-500" : "text-red-500"}
      />
    </div>
  );
}
