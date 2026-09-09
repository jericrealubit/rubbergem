"use client";

import { useMemo, useState } from "react";
import { shiftGroupOf, tableYieldsFromCycles, type ArchivedCycle } from "@/lib/shift-log";
import { rateToRedBucket } from "@/lib/heatmap-color";
import TvHeader from "./TvHeader";
import TvKpiRow, { type KpiTile } from "./TvKpiRow";
import DefectLocationHeatmap from "./DefectLocationHeatmap";
import CycleSequenceGrid from "./CycleSequenceGrid";
import HistoricalTrendHeatmap from "./HistoricalTrendHeatmap";
import {
  operatorNameOf,
  useLiveRows,
  useShiftArchive,
  useShiftConfig,
  type ArchiveRow,
} from "./use-tv-data";
import {
  type LiveLogRow,
  type ShiftHistoryOption,
  type TvLine,
} from "./types";

interface PressShiftConfig {
  operator: string | null;
  shift_group: string | null;
  press_number: string | null;
  mat_types: Record<number, string> | null;
}

interface PressArchiveRow extends ArchiveRow {
  machine_press: string | null;
  cycles: unknown;
  table_line_output_yields: Record<
    string,
    { type?: string; good?: number; reject?: number }
  > | null;
}

interface PressTrendRow extends ArchiveRow {
  total_mats_produced: number | null;
  faulty_mats_produced: number | null;
  cycles: unknown;
}

const PICKER_COLUMNS =
  "id, date, operator_shift, machine_press, cycles, table_line_output_yields";
const TREND_COLUMNS =
  "id, date, operator_shift, total_mats_produced, faulty_mats_produced, cycles";

export default function PressPanel({
  line,
  onSelectLine,
}: {
  line: TvLine;
  onSelectLine: (line: TvLine) => void;
}) {
  const [selectedShiftId, setSelectedShiftId] = useState<number | "live">("live");

  const { rows: liveLogRows, connected: liveLogConnected } = useLiveRows<LiveLogRow>(
    "live_log",
    "*",
    "cycle_number",
    "tv-live-log-sync",
  );
  const { config: shiftConfig, connected: shiftConfigConnected } =
    useShiftConfig<PressShiftConfig>("shift_config", "tv-shift-config-sync");

  const archiveRows = useShiftArchive<PressArchiveRow>(
    "production_logs",
    PICKER_COLUMNS,
    "tv-history-picker-sync",
    "cycles",
  );

  const historyOptions: ShiftHistoryOption[] = useMemo(
    () =>
      archiveRows.map((row) => {
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
          operator: operatorNameOf(row.operator_shift),
          machinePress: row.machine_press,
          cycles: Array.isArray(row.cycles) ? (row.cycles as ArchivedCycle[]) : [],
          matTypes,
        };
      }),
    [archiveRows],
  );

  const selectedOption =
    selectedShiftId === "live"
      ? null
      : historyOptions.find((o) => o.id === selectedShiftId) || null;

  // An archived cycle replays through the same widgets as a live one — only
  // the identity fields differ, so it is reshaped rather than special-cased.
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

  const displayShiftConfig: PressShiftConfig | null =
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

  const tiles: KpiTile[] = useMemo(() => {
    const yields = tableYieldsFromCycles(displayLogRows as unknown as ArchivedCycle[]);
    const rejects = Object.values(yields).reduce((sum, y) => sum + y.reject, 0);
    const cycles = displayLogRows.length;
    const mats = cycles * 4;
    const yieldPct = mats > 0 ? ((mats - rejects) / mats) * 100 : 0;

    return [
      { label: "Total Cycles", value: String(cycles) },
      { label: "Mats Produced", value: String(mats) },
      {
        label: "Rejects",
        value: String(rejects),
        tone: rejects > 0 ? "bad" : "neutral",
      },
      {
        label: "Yield",
        value: `${yieldPct.toFixed(1)}%`,
        tone: yieldPct >= 95 ? "good" : "bad",
      },
    ];
  }, [displayLogRows]);

  return (
    <>
      <TvHeader
        line={line}
        onSelectLine={onSelectLine}
        meta={[
          { label: "Operator", value: displayShiftConfig?.operator || "" },
          { label: "Shift", value: displayShiftConfig?.shift_group || "" },
          {
            label: "Press",
            value: displayShiftConfig?.press_number
              ? `#${displayShiftConfig.press_number}`
              : "",
          },
        ]}
        isConnected={liveLogConnected && shiftConfigConnected}
        historyOptions={historyOptions}
        selectedShiftId={selectedShiftId}
        onSelectShift={setSelectedShiftId}
      />
      <TvKpiRow tiles={tiles} />

      <div className="flex-1 min-h-0 grid grid-cols-[3fr_1fr] gap-3">
        <div className="flex flex-col min-h-0 gap-3">
          <DefectLocationHeatmap
            liveLogRows={displayLogRows}
            matTypes={displayShiftConfig?.mat_types || undefined}
            periodLabel={periodLabel}
          />
          <CycleSequenceGrid liveLogRows={displayLogRows} periodLabel={periodLabel} />
        </div>

        <HistoricalTrendHeatmap<PressTrendRow>
          title="Reject-Rate Trend"
          table="production_logs"
          columns={TREND_COLUMNS}
          channel="tv-production-logs-sync"
          entriesColumn="cycles"
          cellFor={(row) => {
            if (!row) return { className: rateToRedBucket(null), text: "" };
            const total = row.total_mats_produced || 0;
            const faulty = row.faulty_mats_produced || 0;
            const rate = total > 0 ? faulty / total : 0;
            return {
              className: rateToRedBucket(rate),
              text: `${(rate * 100).toFixed(0)}%`,
              title: `${faulty} reject${faulty === 1 ? "" : "s"} of ${total} mats`,
            };
          }}
        />
      </div>
    </>
  );
}
