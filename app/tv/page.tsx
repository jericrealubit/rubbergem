"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import TvHeader from "@/components/tv/TvHeader";
import TvKpiRow from "@/components/tv/TvKpiRow";
import DefectLocationHeatmap from "@/components/tv/DefectLocationHeatmap";
import CycleSequenceGrid from "@/components/tv/CycleSequenceGrid";
import HistoricalTrendHeatmap from "@/components/tv/HistoricalTrendHeatmap";
import type { LiveLogRow } from "@/components/tv/types";

interface ShiftConfig {
  operator: string | null;
  shift_group: string | null;
  press_number: string | null;
  mat_types: Record<number, string> | null;
}

export default function TvPage() {
  const [liveLogRows, setLiveLogRows] = useState<LiveLogRow[]>([]);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [liveLogConnected, setLiveLogConnected] = useState(false);
  const [shiftConfigConnected, setShiftConfigConnected] = useState(false);

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

  const isConnected = liveLogConnected && shiftConfigConnected;

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col p-4 gap-3">
      <TvHeader shiftConfig={shiftConfig} isConnected={isConnected} />
      <TvKpiRow liveLogRows={liveLogRows} />

      <div className="flex-1 min-h-0 grid grid-cols-[3fr_1fr] gap-3">
        <div className="flex flex-col min-h-0 gap-3">
          <DefectLocationHeatmap
            liveLogRows={liveLogRows}
            matTypes={shiftConfig?.mat_types || undefined}
          />
          <CycleSequenceGrid liveLogRows={liveLogRows} />
        </div>
        <HistoricalTrendHeatmap />
      </div>
    </div>
  );
}
