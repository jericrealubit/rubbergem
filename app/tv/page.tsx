"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shiftGroupOf, type ArchivedCycle } from "@/lib/shift-log";
import TvHeader from "@/components/tv/TvHeader";
import TvKpiRow from "@/components/tv/TvKpiRow";
import DefectLocationHeatmap from "@/components/tv/DefectLocationHeatmap";
import CycleSequenceGrid from "@/components/tv/CycleSequenceGrid";
import HistoricalTrendHeatmap from "@/components/tv/HistoricalTrendHeatmap";
import type { LiveLogRow, ShiftHistoryOption } from "@/components/tv/types";

interface ShiftConfig {
  operator: string | null;
  shift_group: string | null;
  press_number: string | null;
  mat_types: Record<number, string> | null;
}

interface RawProductionLogRow {
  id: number;
  date: string;
  operator_shift: string;
  machine_press: string | null;
  cycles: unknown;
  table_line_output_yields: Record<
    string,
    { type?: string; good?: number; reject?: number }
  > | null;
}

export default function TvPage() {
  const [liveLogRows, setLiveLogRows] = useState<LiveLogRow[]>([]);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [liveLogConnected, setLiveLogConnected] = useState(false);
  const [shiftConfigConnected, setShiftConfigConnected] = useState(false);
  const [historyOptions, setHistoryOptions] = useState<ShiftHistoryOption[]>(
    [],
  );
  const [selectedShiftId, setSelectedShiftId] = useState<number | "live">(
    "live",
  );

  useEffect(() => {
    const fetchLiveLog = async () => {
      const { data } = await supabase
        .from("live_log")
        .select("*")
        .eq("shift_id", 1)
        .order("cycle_number", { ascending: true });
      if (data) setLiveLogRows(data as LiveLogRow[]);
    };

    const fetchShiftConfig = async () => {
      const { data } = await supabase
        .from("shift_config")
        .select("*")
        .eq("shift_id", 1)
        .maybeSingle();
      if (data) setShiftConfig(data as ShiftConfig);
    };

    fetchLiveLog();
    fetchShiftConfig();

    const liveLogChannel = supabase
      .channel("tv-live-log-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_log" },
        () => fetchLiveLog(),
      )
      .subscribe((status) => {
        setLiveLogConnected(status === "SUBSCRIBED");
      });

    const shiftConfigChannel = supabase
      .channel("tv-shift-config-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_config" },
        () => fetchShiftConfig(),
      )
      .subscribe((status) => {
        setShiftConfigConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(liveLogChannel);
      supabase.removeChannel(shiftConfigChannel);
    };
  }, []);

  // Shift-history dropdown: fetch the full production_logs archive and
  // collapse duplicate (date, shift group) rows down to the richest one —
  // same dedupe already duplicated in ProductionHistory.tsx and
  // HistoricalTrendHeatmap.tsx; kept as a third local copy here rather than a
  // shared helper so this change doesn't touch those unrelated files.
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("production_logs")
        .select(
          "id, date, operator_shift, machine_press, cycles, table_line_output_yields",
        )
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      if (!data) return;

      const rows = data as RawProductionLogRow[];
      const byShift = new Map<string, RawProductionLogRow>();
      rows.forEach((row) => {
        const key = `${row.date}|${shiftGroupOf(row.operator_shift)}`;
        const held = byShift.get(key);
        const rowCycles = Array.isArray(row.cycles) ? row.cycles.length : 0;
        const heldCycles =
          held && Array.isArray(held.cycles) ? held.cycles.length : -1;
        if (
          !held ||
          rowCycles > heldCycles ||
          (rowCycles === heldCycles && row.id > held.id)
        ) {
          byShift.set(key, row);
        }
      });

      const options: ShiftHistoryOption[] = Array.from(byShift.values())
        .map((row) => {
          const yields = row.table_line_output_yields || {};
          const matTypes: Record<number, string> = {};
          [1, 2, 3, 4].forEach((id) => {
            const type = yields[`table_${id}`]?.type;
            if (type) matTypes[id] = type;
          });

          return {
            id: row.id,
            date: row.date,
            shiftGroup: shiftGroupOf(row.operator_shift),
            operator: row.operator_shift.split("(")[0].trim(),
            machinePress: row.machine_press,
            cycles: Array.isArray(row.cycles)
              ? (row.cycles as ArchivedCycle[])
              : [],
            matTypes,
          };
        })
        .sort((a, b) => {
          const byDate = b.date.localeCompare(a.date);
          if (byDate !== 0) return byDate;
          if (a.shiftGroup === b.shiftGroup) return 0;
          return a.shiftGroup === "night" ? -1 : 1;
        });

      setHistoryOptions(options);
    };

    fetchHistory();

    const channel = supabase
      .channel("tv-history-picker-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_logs" },
        () => fetchHistory(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isConnected = liveLogConnected && shiftConfigConnected;

  const selectedOption =
    selectedShiftId === "live"
      ? null
      : historyOptions.find((o) => o.id === selectedShiftId) || null;

  const displayLogRows: LiveLogRow[] = useMemo(() => {
    if (selectedShiftId === "live") return liveLogRows;
    if (!selectedOption) return [];
    return selectedOption.cycles.map((c, i) => ({
      live_id: i,
      cycle_number: c.cycle_number ?? i + 1,
      start_time: c.start_time ?? null,
      end_time: c.end_time ?? null,
      short_mold_json: (c.short_mold_json as LiveLogRow["short_mold_json"]) ?? null,
      bubble_json: (c.bubble_json as LiveLogRow["bubble_json"]) ?? null,
    }));
  }, [selectedShiftId, liveLogRows, selectedOption]);

  const displayShiftConfig: ShiftConfig | null =
    selectedShiftId === "live"
      ? shiftConfig
      : selectedOption
        ? {
            operator: selectedOption.operator,
            shift_group: selectedOption.shiftGroup,
            press_number: selectedOption.machinePress?.match(/\d+/)?.[0] ?? null,
            mat_types: selectedOption.matTypes,
          }
        : null;

  const periodLabel =
    selectedShiftId === "live" || !selectedOption
      ? "This Shift"
      : `${new Date(`${selectedOption.date}T00:00:00`).toLocaleDateString("en-AU", { month: "short", day: "numeric" })} — ${
          selectedOption.shiftGroup === "night" ? "Night" : "Day"
        }`;

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col p-4 gap-3">
      <TvHeader
        shiftConfig={displayShiftConfig}
        isConnected={isConnected}
        historyOptions={historyOptions}
        selectedShiftId={selectedShiftId}
        onSelectShift={setSelectedShiftId}
      />
      <TvKpiRow liveLogRows={displayLogRows} />

      <div className="flex-1 min-h-0 grid grid-cols-[3fr_1fr] gap-3">
        <div className="flex flex-col min-h-0 gap-3">
          <DefectLocationHeatmap
            liveLogRows={displayLogRows}
            matTypes={displayShiftConfig?.mat_types || undefined}
            periodLabel={periodLabel}
          />
          <CycleSequenceGrid liveLogRows={displayLogRows} periodLabel={periodLabel} />
        </div>
        <HistoricalTrendHeatmap />
      </div>
    </div>
  );
}
