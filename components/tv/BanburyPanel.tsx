"use client";

import { useMemo, useState } from "react";
import { shiftGroupOf } from "@/lib/shift-log";
import {
  BANBURY_DEFAULT_RUN_TIME_MINUTES,
  isCheckOverrun,
  totalDowntimeMinutes,
  type BanburyCheckEntry,
} from "@/lib/banbury-log";
import { minutesToRedBucket } from "@/lib/heatmap-color";
import TvHeader from "./TvHeader";
import TvKpiRow, { type KpiTile } from "./TvKpiRow";
import TvSequenceGrid, { type SequenceRow } from "./TvSequenceGrid";
import BanburyTankLevels from "./BanburyTankLevels";
import HistoricalTrendHeatmap from "./HistoricalTrendHeatmap";
import {
  operatorNameOf,
  useLiveRows,
  useShiftArchive,
  useShiftConfig,
  type ArchiveRow,
} from "./use-tv-data";
import type {
  BanburyLiveLogRow,
  BanburyShiftHistoryOption,
  TvLine,
} from "./types";

interface BanburyShiftConfig {
  operator: string | null;
  shift_group: string | null;
  product: string | null;
  bag_weight_kg: number | null;
  batches_made: number | null;
  mesh_bags_count: number | null;
  run_time_minutes: number | null;
}

interface BanburyArchiveRow extends ArchiveRow {
  checks: unknown;
  product: string | null;
  batches_made: number | null;
  mesh_bags_count: number | null;
  tonnes: number | null;
  run_time_minutes: number | null;
  average_output_ph: number | null;
}

interface BanburyTrendRow extends ArchiveRow {
  checks: unknown;
}

/**
 * The six material/chemical ticks on the paper form. BanburyForm pre-checks
 * all six and the operator un-ticks what wasn't done, so only an explicit
 * `false` is a miss — `null` (a check logged before a column existed) is not.
 */
type TickKey =
  | "crumb_rubber"
  | "other_rubbers"
  | "powdered_chemicals"
  | "rpo"
  | "sulphur"
  | "liquid_chemicals";

const TICK_LABELS: { key: TickKey; label: string }[] = [
  { key: "crumb_rubber", label: "Crumb" },
  { key: "other_rubbers", label: "Rubbers" },
  { key: "powdered_chemicals", label: "Powder" },
  { key: "rpo", label: "RPO" },
  { key: "sulphur", label: "Sulphur" },
  { key: "liquid_chemicals", label: "Liquid" },
];

/** One check as the widgets read it, from either a live row or an archived one. */
interface BanburyDisplayCheck {
  key: string | number;
  checkNumber: number;
  runTimeMinutes: number | null;
  ticks: Record<TickKey, boolean | null>;
  leftTank: string;
  rightTank: string;
}

/** The shift totals the KPI row shows — live from config, or archived. */
interface BanburyTotals {
  batchesMade: number;
  bagsCount: number;
  tonnes: number;
  runTimeMinutes: number;
  averageOutputPH: number;
}

const PICKER_COLUMNS =
  "id, date, operator_shift, checks, product, batches_made, mesh_bags_count, tonnes, run_time_minutes, average_output_ph";
const TREND_COLUMNS = "id, date, operator_shift, checks";

export default function BanburyPanel({
  line,
  onSelectLine,
}: {
  line: TvLine;
  onSelectLine: (line: TvLine) => void;
}) {
  const [selectedShiftId, setSelectedShiftId] = useState<number | "live">("live");
  const isHistory = selectedShiftId !== "live";

  const { rows: liveRows, connected: liveConnected } =
    useLiveRows<BanburyLiveLogRow>(
      "banbury_live_log",
      "*",
      "check_number",
      "tv-banbury-live-log-sync",
    );
  const { config: shiftConfig, connected: configConnected } =
    useShiftConfig<BanburyShiftConfig>(
      "banbury_shift_config",
      "tv-banbury-shift-config-sync",
    );

  const archiveRows = useShiftArchive<BanburyArchiveRow>(
    "banbury_production_logs",
    PICKER_COLUMNS,
    "tv-banbury-history-picker-sync",
    "checks",
  );

  const historyOptions: BanburyShiftHistoryOption[] = useMemo(
    () =>
      archiveRows.map((row) => ({
        id: row.id,
        date: row.date,
        shiftGroup: shiftGroupOf(row.operator_shift),
        operator: operatorNameOf(row.operator_shift),
        checks: Array.isArray(row.checks)
          ? (row.checks as BanburyCheckEntry[])
          : [],
        product: row.product || "",
        batchesMade: row.batches_made || 0,
        bagsCount: row.mesh_bags_count || 0,
        tonnes: row.tonnes || 0,
        runTimeMinutes: row.run_time_minutes || 0,
        averageOutputPH: row.average_output_ph || 0,
      })),
    [archiveRows],
  );

  const selectedOption = isHistory
    ? historyOptions.find((o) => o.id === selectedShiftId) || null
    : null;

  const checks: BanburyDisplayCheck[] = useMemo(() => {
    if (!isHistory) {
      return liveRows.map((row, i) => ({
        key: row.banbury_id,
        checkNumber: row.check_number ?? i + 1,
        runTimeMinutes: row.run_time_minutes,
        ticks: {
          crumb_rubber: row.crumb_rubber,
          other_rubbers: row.other_rubbers,
          powdered_chemicals: row.powdered_chemicals,
          rpo: row.rpo,
          sulphur: row.sulphur,
          liquid_chemicals: row.liquid_chemicals,
        },
        leftTank: row.left_tank_level || "",
        rightTank: row.right_tank_level || "",
      }));
    }
    if (!selectedOption) return [];
    return selectedOption.checks.map((c, i) => ({
      key: `${c.cycle_number ?? i}-${c.start_time ?? i}`,
      checkNumber: c.cycle_number ?? i + 1,
      runTimeMinutes: c.run_time_minutes ?? null,
      ticks: {
        crumb_rubber: c.crumb_rubber ?? null,
        other_rubbers: c.other_rubbers ?? null,
        powdered_chemicals: c.powdered_chemicals ?? null,
        rpo: c.rpo ?? null,
        sulphur: c.sulphur ?? null,
        liquid_chemicals: c.liquid_chemicals ?? null,
      },
      leftTank: c.left_tank_level || "",
      rightTank: c.right_tank_level || "",
    }));
  }, [isHistory, liveRows, selectedOption]);

  // Live totals come off banbury_shift_config (the operator maintains them
  // there, they are not derived from the checks); an archived shift shows the
  // snapshot taken at write time, tonnes and average output included.
  const totals: BanburyTotals = useMemo(() => {
    if (isHistory) {
      return selectedOption
        ? {
            batchesMade: selectedOption.batchesMade,
            bagsCount: selectedOption.bagsCount,
            tonnes: selectedOption.tonnes,
            runTimeMinutes: selectedOption.runTimeMinutes,
            averageOutputPH: selectedOption.averageOutputPH,
          }
        : {
            batchesMade: 0,
            bagsCount: 0,
            tonnes: 0,
            runTimeMinutes: 0,
            averageOutputPH: 0,
          };
    }

    const bagsCount = shiftConfig?.mesh_bags_count || 0;
    const bagWeight = shiftConfig?.bag_weight_kg ?? 700;
    const runTimeMinutes = shiftConfig?.run_time_minutes || 0;
    const tonnes = (bagsCount * bagWeight) / 1000;
    const runTimeHours = runTimeMinutes / 60;

    return {
      batchesMade: shiftConfig?.batches_made || 0,
      bagsCount,
      tonnes,
      runTimeMinutes,
      averageOutputPH: runTimeHours > 0 ? tonnes / runTimeHours : 0,
    };
  }, [isHistory, selectedOption, shiftConfig]);

  const downtime = useMemo(
    () => Math.round(totalDowntimeMinutes(checks.map((c) => ({ run_time_minutes: c.runTimeMinutes })))),
    [checks],
  );

  const displayMeta = isHistory
    ? {
        operator: selectedOption?.operator || "",
        shift: selectedOption?.shiftGroup || "",
        product: selectedOption?.product || "",
      }
    : {
        operator: shiftConfig?.operator || "",
        shift: shiftConfig?.shift_group || "",
        product: shiftConfig?.product || "",
      };

  const periodLabel =
    !isHistory || !selectedOption
      ? "This Shift"
      : `${new Date(`${selectedOption.date}T00:00:00`).toLocaleDateString("en-AU", { month: "short", day: "numeric" })} — ${
          selectedOption.shiftGroup === "night" ? "Night" : "Day"
        }`;

  const tiles: KpiTile[] = [
    { label: "Checks Logged", value: String(checks.length) },
    { label: "Batches Made", value: String(totals.batchesMade) },
    { label: "Tonnes", value: totals.tonnes.toFixed(2) },
    { label: "Avg Output P/H", value: totals.averageOutputPH.toFixed(2) },
    {
      label: `Downtime (Run:${BANBURY_DEFAULT_RUN_TIME_MINUTES}m)`,
      value: `${downtime}m`,
      tone: downtime > 0 ? "bad" : "neutral",
    },
  ];

  // The matrix is Banbury's headline panel, the counterpart to the Press
  // defect heatmap: one row per material, one cell per check, red where the
  // operator un-ticked it — so a viewer sees *when* something was skipped,
  // with the shift's tally beside each material's name.
  const matrixRows: SequenceRow[] = TICK_LABELS.map(({ key, label }) => {
    const misses = checks.filter((check) => check.ticks[key] === false).length;
    return {
      label,
      badge: String(misses),
      cells: checks.map((check) => {
        const missed = check.ticks[key] === false;
        return {
          key: check.key,
          tone: missed ? ("bad" as const) : ("good" as const),
          title: `Check ${check.checkNumber} — ${label} ${missed ? "missed" : "ticked"}`,
        };
      }),
    };
  });

  const cycleTimeRows: SequenceRow[] = [
    {
      label: "Checks",
      cells: checks.map((check) => ({
        key: check.key,
        tone: isCheckOverrun(check.runTimeMinutes) ? ("bad" as const) : ("good" as const),
        label: check.runTimeMinutes === null ? "—" : `${check.runTimeMinutes}`,
        title: `Check ${check.checkNumber} — ${
          check.runTimeMinutes === null
            ? "no cycle time recorded"
            : `${check.runTimeMinutes}m against a ${BANBURY_DEFAULT_RUN_TIME_MINUTES}m cycle`
        }`,
      })),
    },
  ];

  return (
    <>
      <TvHeader
        line={line}
        onSelectLine={onSelectLine}
        meta={[
          { label: "Operator", value: displayMeta.operator },
          { label: "Shift", value: displayMeta.shift },
          { label: "Product", value: displayMeta.product },
        ]}
        isConnected={liveConnected && configConnected}
        historyOptions={historyOptions}
        selectedShiftId={selectedShiftId}
        onSelectShift={setSelectedShiftId}
      />
      <TvKpiRow tiles={tiles} />

      <div className="flex-1 min-h-0 grid grid-cols-[3fr_1fr] gap-3">
        <div className="flex flex-col min-h-0 gap-3">
          <TvSequenceGrid
            title={`Material Checks — ${periodLabel}`}
            rows={matrixRows}
            legend={[
              { tone: "good", label: "Ticked" },
              { tone: "bad", label: "Missed" },
            ]}
            cellClassName="flex-1 min-w-[6px] max-w-[60px]"
            labelWidth="w-20"
            emptyMessage="No checks logged yet"
            className="flex-[3]"
          />

          <div className="flex-[2] min-h-0 grid grid-cols-[2fr_1fr] gap-3">
            <TvSequenceGrid
              title={`Check Cycle Times — ${periodLabel}`}
              rows={cycleTimeRows}
              legend={[
                { tone: "good", label: `On Time (${BANBURY_DEFAULT_RUN_TIME_MINUTES}m)` },
                { tone: "bad", label: "Overrun" },
              ]}
              cellClassName="flex-1 min-w-[10px] max-w-[44px]"
              emptyMessage="No checks logged yet"
              className="h-full"
            />
            <BanburyTankLevels checks={checks} />
          </div>
        </div>

        <HistoricalTrendHeatmap<BanburyTrendRow>
          title="Downtime Trend"
          table="banbury_production_logs"
          columns={TREND_COLUMNS}
          channel="tv-banbury-production-logs-sync"
          entriesColumn="checks"
          cellFor={(row) => {
            if (!row) return { className: minutesToRedBucket(null), text: "" };
            const shiftChecks = Array.isArray(row.checks)
              ? (row.checks as BanburyCheckEntry[])
              : [];
            const minutes = Math.round(totalDowntimeMinutes(shiftChecks));
            return {
              className: minutesToRedBucket(minutes),
              text: `${minutes}m`,
              title: `${minutes} minute${minutes === 1 ? "" : "s"} past the ${BANBURY_DEFAULT_RUN_TIME_MINUTES}m cycle across ${shiftChecks.length} check${
                shiftChecks.length === 1 ? "" : "s"
              }`,
            };
          }}
        />
      </div>
    </>
  );
}
