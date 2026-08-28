"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shiftGroupOf, type ShiftGroup } from "@/lib/shift-log";
import { rateToRedBucket } from "@/lib/heatmap-color";

const DAYS_BACK = 14;

interface ProductionLogRow {
  id: number;
  date: string;
  operator_shift: string;
  total_mats_produced: number | null;
  faulty_mats_produced: number | null;
  cycles: unknown[] | null;
}

function perthDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
  }).format(d);
}

export default function HistoricalTrendHeatmap() {
  const [rows, setRows] = useState<ProductionLogRow[]>([]);

  useEffect(() => {
    const cutoff = perthDate(DAYS_BACK);

    const fetchLogs = async () => {
      const { data } = await supabase
        .from("production_logs")
        .select("id, date, operator_shift, total_mats_produced, faulty_mats_produced, cycles")
        .gte("date", cutoff)
        .order("date", { ascending: true });
      if (data) setRows(data as ProductionLogRow[]);
    };

    fetchLogs();

    const channel = supabase
      .channel("tv-production-logs-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_logs" },
        () => fetchLogs(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const byDateShift = useMemo(() => {
    const map = new Map<string, ProductionLogRow>();
    rows.forEach((row) => {
      const key = `${row.date}|${shiftGroupOf(row.operator_shift)}`;
      const held = map.get(key);
      if (!held) {
        map.set(key, row);
        return;
      }
      const heldCycles = Array.isArray(held.cycles) ? held.cycles.length : 0;
      const rowCycles = Array.isArray(row.cycles) ? row.cycles.length : 0;
      if (rowCycles > heldCycles || (rowCycles === heldCycles && row.id > held.id)) {
        map.set(key, row);
      }
    });
    return map;
  }, [rows]);

  const dates = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i <= DAYS_BACK; i++) list.push(perthDate(i));
    return list; // newest first
  }, []);

  const rateFor = (date: string, shift: ShiftGroup): number | null => {
    const row = byDateShift.get(`${date}|${shift}`);
    if (!row) return null;
    const total = row.total_mats_produced || 0;
    const faulty = row.faulty_mats_produced || 0;
    return total > 0 ? faulty / total : 0;
  };

  return (
    <div className="h-full min-h-0 bg-neutral-900 rounded-xl border border-neutral-800 p-3 flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
        Reject-Rate Trend — Last {DAYS_BACK} Days
      </h2>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-[10px] font-bold uppercase text-neutral-500 pb-1">
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
            <span className="text-[10px] font-mono text-neutral-400 pr-1">
              {date.slice(5)}
            </span>
            {(["day", "night"] as const).map((shift) => {
              const rate = rateFor(date, shift);
              return (
                <div
                  key={shift}
                  className={`h-full rounded flex items-center justify-center text-[10px] font-mono font-bold text-neutral-100 ${rateToRedBucket(rate)}`}
                >
                  {rate === null ? "" : `${(rate * 100).toFixed(0)}%`}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
