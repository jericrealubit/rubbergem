"use client";

import { useMemo, useState } from "react";
import { shiftGroupOf } from "@/lib/shift-log";
import type { BalesArchivedCycle } from "@/lib/bales-log";
import { rateToRedBucket } from "@/lib/heatmap-color";
import TvHeader from "./TvHeader";
import TvKpiRow, { type KpiTile } from "./TvKpiRow";
import TvSequenceGrid, { type SequenceRow } from "./TvSequenceGrid";
import BalesOutputChart, { type BalesChartCycle } from "./BalesOutputChart";
import BagChangeLog from "./BagChangeLog";
import HistoricalTrendHeatmap from "./HistoricalTrendHeatmap";
import {
  operatorNameOf,
  useLiveRows,
  useShiftArchive,
  useShiftConfig,
  type ArchiveRow,
} from "./use-tv-data";
import type {
  BagChangeRow,
  BalesLiveLogRow,
  BalesShiftHistoryOption,
  TvLine,
} from "./types";

interface BalesShiftConfig {
  operator: string | null;
  shift_group: string | null;
  mesh_type: string | null;
}

interface BalesArchiveRow extends ArchiveRow {
  cycles: unknown;
}

interface BalesTrendRow extends ArchiveRow {
  cycles: unknown;
  total_bales_produced: number | null;
  total_faulty_bales: number | null;
}

/** One cycle as the widgets read it, from either a live row or an archived one. */
interface BalesDisplayCycle extends BalesChartCycle {
  runTimeMinutes: number;
  baleType: string;
  meshType: string;
}

const PICKER_COLUMNS = "id, date, operator_shift, cycles";
const TREND_COLUMNS =
  "id, date, operator_shift, cycles, total_bales_produced, total_faulty_bales";

export default function BalesPanel({
  line,
  onSelectLine,
}: {
  line: TvLine;
  onSelectLine: (line: TvLine) => void;
}) {
  const [selectedShiftId, setSelectedShiftId] = useState<number | "live">("live");
  const isHistory = selectedShiftId !== "live";

  const { rows: liveRows, connected: liveConnected } =
    useLiveRows<BalesLiveLogRow>(
      "bales_live_log",
      "*",
      "cycle_number",
      "tv-bales-live-log-sync",
    );
  const { config: shiftConfig, connected: configConnected } =
    useShiftConfig<BalesShiftConfig>(
      "bales_shift_config",
      "tv-bales-shift-config-sync",
    );
  const { rows: bagChanges } = useLiveRows<BagChangeRow>(
    "bales_bag_changes",
    "*",
    "logged_at",
    "tv-bales-bag-changes-sync",
    false,
  );

  const archiveRows = useShiftArchive<BalesArchiveRow>(
    "bales_production_logs",
    PICKER_COLUMNS,
    "tv-bales-history-picker-sync",
    "cycles",
  );

  const historyOptions: BalesShiftHistoryOption[] = useMemo(
    () =>
      archiveRows.map((row) => {
        const cycles = Array.isArray(row.cycles)
          ? (row.cycles as BalesArchivedCycle[])
          : [];
        // Mesh type is snapshotted per cycle, so the shift's mesh is the last
        // cycle that carried one (cycles arrive sorted by start_time).
        const meshType =
          [...cycles].reverse().find((c) => c.mesh_type)?.mesh_type || "";

        return {
          id: row.id,
          date: row.date,
          shiftGroup: shiftGroupOf(row.operator_shift),
          operator: operatorNameOf(row.operator_shift),
          cycles,
          meshType,
        };
      }),
    [archiveRows],
  );

  const selectedOption = isHistory
    ? historyOptions.find((o) => o.id === selectedShiftId) || null
    : null;

  const cycles: BalesDisplayCycle[] = useMemo(() => {
    if (!isHistory) {
      return liveRows.map((row, i) => ({
        key: row.bales_id,
        cycleNumber: row.cycle_number ?? i + 1,
        balesProduced: row.bales_produced ?? 0,
        faultyBales: row.faulty_bales_count ?? 0,
        runTimeMinutes: row.run_time_minutes ?? 0,
        baleType: row.bale_type || "",
        meshType: row.mesh_type || "",
      }));
    }
    if (!selectedOption) return [];
    return selectedOption.cycles.map((c, i) => ({
      key: `${c.cycle_number ?? i}-${c.start_time ?? i}`,
      cycleNumber: c.cycle_number ?? i + 1,
      balesProduced: c.bales_produced ?? 0,
      faultyBales: c.faulty_bales_count ?? 0,
      runTimeMinutes: c.run_time_minutes ?? 0,
      baleType: c.bale_type || "",
      meshType: c.mesh_type || "",
    }));
  }, [isHistory, liveRows, selectedOption]);

  const displayConfig: BalesShiftConfig | null = isHistory
    ? selectedOption
      ? {
          operator: selectedOption.operator,
          shift_group: selectedOption.shiftGroup,
          mesh_type: selectedOption.meshType,
        }
      : null
    : shiftConfig;

  const periodLabel =
    !isHistory || !selectedOption
      ? "This Shift"
      : `${new Date(`${selectedOption.date}T00:00:00`).toLocaleDateString("en-AU", { month: "short", day: "numeric" })} — ${
          selectedOption.shiftGroup === "night" ? "Night" : "Day"
        }`;

  const tiles: KpiTile[] = useMemo(() => {
    const produced = cycles.reduce((sum, c) => sum + c.balesProduced, 0);
    const faulty = cycles.reduce((sum, c) => sum + c.faultyBales, 0);
    const runTime = cycles.reduce((sum, c) => sum + c.runTimeMinutes, 0);
    const yieldPct = produced > 0 ? ((produced - faulty) / produced) * 100 : 0;

    return [
      { label: "Cycles Logged", value: String(cycles.length) },
      { label: "Bales Produced", value: String(produced) },
      {
        label: "Faulty Bales",
        value: String(faulty),
        tone: faulty > 0 ? "bad" : "neutral",
      },
      {
        label: "Yield",
        value: produced > 0 ? `${yieldPct.toFixed(1)}%` : "—",
        tone: produced === 0 ? "neutral" : yieldPct >= 95 ? "good" : "bad",
      },
      { label: "Run Time", value: `${runTime}m` },
    ];
  }, [cycles]);

  // The strip carries each cycle's bale count, so a viewer can read the run
  // of good cycles and the size of each without decoding bar heights.
  const sequenceRows: SequenceRow[] = [
    {
      label: "Cycles",
      cells: cycles.map((cycle) => ({
        key: cycle.key,
        tone: cycle.faultyBales > 0 ? ("bad" as const) : ("good" as const),
        label: String(cycle.balesProduced),
        title: `Cycle ${cycle.cycleNumber} — ${cycle.balesProduced} bales${
          cycle.faultyBales > 0 ? `, ${cycle.faultyBales} faulty` : ""
        }${cycle.baleType ? ` — ${cycle.baleType}` : ""}`,
      })),
    },
  ];

  return (
    <>
      <TvHeader
        line={line}
        onSelectLine={onSelectLine}
        meta={[
          { label: "Operator", value: displayConfig?.operator || "" },
          { label: "Shift", value: displayConfig?.shift_group || "" },
          { label: "Mesh", value: displayConfig?.mesh_type || "" },
        ]}
        isConnected={liveConnected && configConnected}
        historyOptions={historyOptions}
        selectedShiftId={selectedShiftId}
        onSelectShift={setSelectedShiftId}
      />
      <TvKpiRow tiles={tiles} />

      <div className="flex-1 min-h-0 grid grid-cols-[3fr_1fr] gap-3">
        <div className="flex flex-col min-h-0 gap-3">
          <BalesOutputChart cycles={cycles} periodLabel={periodLabel} />
          <div className="flex-[2] min-h-0 grid grid-cols-2 gap-3">
            <TvSequenceGrid
              title={`Cycle Sequence — ${periodLabel}`}
              rows={sequenceRows}
              legend={[
                { tone: "good", label: "Clean" },
                { tone: "bad", label: "Faulty" },
              ]}
              cellClassName="flex-1 min-w-[10px] max-w-[44px]"
              className="h-full"
            />
            <BagChangeLog
              rows={bagChanges}
              isHistory={isHistory}
              className="h-full"
            />
          </div>
        </div>

        <HistoricalTrendHeatmap<BalesTrendRow>
          title="Faulty-Rate Trend"
          table="bales_production_logs"
          columns={TREND_COLUMNS}
          channel="tv-bales-production-logs-sync"
          entriesColumn="cycles"
          cellFor={(row) => {
            if (!row) return { className: rateToRedBucket(null), text: "" };
            const produced = row.total_bales_produced || 0;
            const faulty = row.total_faulty_bales || 0;
            const rate = produced > 0 ? faulty / produced : 0;
            return {
              className: rateToRedBucket(rate),
              text: `${(rate * 100).toFixed(0)}%`,
              title: `${faulty} faulty of ${produced} bales`,
            };
          }}
        />
      </div>
    </>
  );
}
