"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shiftGroupOf, cycleKey, type BanburyCheckEntry } from "@/lib/banbury-log";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  FlaskConical,
  Folder,
  FolderOpen,
  Layers,
  TrendingUp,
} from "lucide-react";

const TICK_COLUMNS: { key: keyof BanburyCheckEntry; label: string }[] = [
  { key: "crumb_rubber", label: "Crumb Rubber" },
  { key: "other_rubbers", label: "Other Rubbers" },
  { key: "powdered_chemicals", label: "Powdered Chemicals" },
  { key: "rpo", label: "RPO" },
  { key: "sulphur", label: "Sulphur" },
  { key: "liquid_chemicals", label: "Liquid Chemicals" },
];

interface RawBanburyProductionLog {
  id: number;
  date: string;
  operator_shift: string;
  product: string;
  bag_weight_kg: number | null;
  batches_made: number | null;
  mesh_bags_count: number | null;
  tonnes: number | null;
  run_time_minutes: number | null;
  average_output_ph: number | null;
  checks: BanburyCheckEntry[];
}

interface DayBanburySummary {
  id: number;
  dateString: string;
  shift: "Day" | "Night";
  operator: string;
  product: string;
  bagWeightKg: number;
  batchesMade: number;
  bagsCount: number;
  tonnes: number;
  runTimeMinutes: number;
  averageOutputPH: number;
  totalChecks: number;
  checks: BanburyCheckEntry[];
}

interface MonthGroup {
  monthName: string;
  totalChecks: number;
  totalBatches: number;
  days: DayBanburySummary[];
}

export default function BanburyHistory() {
  const [historicalData, setHistoricalData] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [expandedMonth, setExpandedMonth] = useState<string | null>("");
  const [expandedDay, setExpandedDay] = useState<string | null>("");
  const [dayViewMode, setDayViewMode] = useState<"summary" | "table">(
    "summary",
  );

  useEffect(() => {
    setIsMounted(true);

    async function fetchBanburyData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("banbury_production_logs")
          .select("*")
          .order("date", { ascending: false });

        if (error) throw error;

        const rawLogs: RawBanburyProductionLog[] = data || [];
        const monthsMap: Record<string, MonthGroup> = {};
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ];

        // One row per (date, shift group) -- collapse any duplicates the
        // same way ProductionHistory.tsx/BalesHistory.tsx do, keeping the
        // richest (most checks), newest id breaking a tie.
        const shiftsMap = new Map<string, RawBanburyProductionLog>();
        rawLogs.forEach((log) => {
          const key = `${log.date}|${shiftGroupOf(log.operator_shift)}`;
          const held = shiftsMap.get(key);
          if (!held) {
            shiftsMap.set(key, log);
            return;
          }

          const heldChecks = Array.isArray(held.checks) ? held.checks.length : 0;
          const logChecks = Array.isArray(log.checks) ? log.checks.length : 0;
          if (
            logChecks > heldChecks ||
            (logChecks === heldChecks && log.id > held.id)
          ) {
            shiftsMap.set(key, log);
          }
        });

        shiftsMap.forEach((log) => {
          const dateParts = log.date.split("-");
          const year = dateParts[0];
          const monthIdx = parseInt(dateParts[1], 10) - 1;
          const monthName = `${monthNames[monthIdx]} ${year}`;

          if (!monthsMap[monthName]) {
            monthsMap[monthName] = {
              monthName,
              totalChecks: 0,
              totalBatches: 0,
              days: [],
            };
          }

          const isNight = shiftGroupOf(log.operator_shift) === "night";
          const cleanOperator = log.operator_shift.split("(")[0].trim();
          const checksArray = Array.isArray(log.checks) ? log.checks : [];

          monthsMap[monthName].totalChecks += checksArray.length;
          monthsMap[monthName].totalBatches += log.batches_made || 0;
          monthsMap[monthName].days.push({
            id: log.id,
            dateString: log.date,
            shift: isNight ? "Night" : "Day",
            operator: cleanOperator,
            product: log.product || "—",
            bagWeightKg: log.bag_weight_kg || 0,
            batchesMade: log.batches_made || 0,
            bagsCount: log.mesh_bags_count || 0,
            tonnes: log.tonnes || 0,
            runTimeMinutes: log.run_time_minutes || 0,
            averageOutputPH: log.average_output_ph || 0,
            totalChecks: checksArray.length,
            checks: checksArray,
          });
        });

        const structuredList = Object.values(monthsMap).sort((a, b) => {
          return (
            new Date(b.days[0].dateString).getTime() -
            new Date(a.days[0].dateString).getTime()
          );
        });

        structuredList.forEach((m) => {
          m.days.sort((a, b) => {
            const byDate =
              new Date(b.dateString).getTime() -
              new Date(a.dateString).getTime();
            if (byDate !== 0) return byDate;
            return a.shift === b.shift ? 0 : a.shift === "Night" ? -1 : 1;
          });
        });

        setHistoricalData(structuredList);
      } catch (err: any) {
        console.error("Error fetching banbury_production_logs:", err);
        setError(err.message || "Failed parsing Banbury production records.");
      } finally {
        setLoading(false);
      }
    }

    fetchBanburyData();
  }, []);

  const toggleMonth = (monthName: string) => {
    setExpandedMonth(expandedMonth === monthName ? null : monthName);
  };

  const toggleDay = (dateString: string) => {
    setExpandedDay(expandedDay === dateString ? null : dateString);
    setDayViewMode("summary");
  };

  const formatDateLabel = (str: string) => {
    return new Date(str).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (!isMounted) return null;

  if (loading) {
    return (
      <div className="w-full max-w-md ipad:max-w-3xl mx-auto p-8 text-center text-xs font-semibold text-muted-foreground">
        <Layers className="w-5 h-5 mx-auto mb-2 text-primary animate-spin" />
        <span>Parsing Extracted Banbury Logs...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md ipad:max-w-3xl mx-auto p-3 ipad:p-4 space-y-4 pb-12 font-sans text-foreground">
      <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-sm flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary-foreground/70" />
        <div>
          <h1 className="text-lg font-bold tracking-wider uppercase">
            Banbury Production History
          </h1>
          <p className="text-[11px] text-primary-foreground/80 leading-none">
            Nested Monthly Records &amp; Chemical Checks
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Database Fetch Failed: </span>
            {error}. Verify that RLS SELECT permissions are correct for
            banbury_production_logs.
          </div>
        </div>
      )}

      <div className="space-y-3">
        {historicalData.map((month) => {
          const isMonthOpen = expandedMonth === month.monthName;

          return (
            <div key={month.monthName} className="space-y-1">
              <button
                onClick={() => toggleMonth(month.monthName)}
                className={`w-full p-3.5 flex items-center justify-between rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                  isMonthOpen
                    ? "bg-accent-chip/60 border-primary/30 text-accent-ink"
                    : "bg-card border-border text-foreground/80 hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isMonthOpen ? (
                    <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span>{month.monthName}</span>
                  <span className="normal-case text-[10px] font-sans font-medium text-muted-foreground ml-1">
                    (checks:{month.totalChecks}{" "}
                    <span className="font-bold text-foreground">
                      batches:{month.totalBatches}
                    </span>
                    )
                  </span>
                </div>
                {isMonthOpen ? (
                  <ChevronUp className="w-4 h-4 text-primary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isMonthOpen && (
                <div className="pl-3 pr-1 py-1 space-y-2 border-l-2 border-primary/20 ml-5">
                  {month.days.map((day) => {
                    const keyForDay = `${day.dateString}-${day.shift}-${day.id}`;
                    const isDayOpen = expandedDay === keyForDay;
                    const dayChecks = Array.isArray(day.checks)
                      ? day.checks
                      : [];
                    const runTimeHours = day.runTimeMinutes / 60;

                    return (
                      <div key={keyForDay} className="space-y-1">
                        <button
                          onClick={() => toggleDay(keyForDay)}
                          className={`w-full p-2.5 flex items-center justify-between text-left text-xs font-semibold rounded-lg border transition-all ${
                            isDayOpen
                              ? "bg-card border-border text-foreground shadow-sm"
                              : "bg-muted/70 border-border/80 text-muted-foreground hover:bg-accent/50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="block text-[11px] font-bold text-foreground">
                                {formatDateLabel(day.dateString)}
                              </span>
                              <span className="normal-case text-[10px] font-sans font-medium text-muted-foreground">
                                (checks:{day.totalChecks}{" "}
                                <span className="font-bold text-foreground">
                                  batches:{day.batchesMade}
                                </span>
                                )
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
                              {day.shift} Shift • Operator: {day.operator} •
                              Product: {day.product}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDayOpen ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {isDayOpen && (
                          <Card className="bg-card border-border rounded-lg shadow-inner overflow-hidden mx-0.5 my-1">
                            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1.5 border-b border-border">
                              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                <FlaskConical className="w-3.5 h-3.5 text-primary" />
                                {dayViewMode === "summary"
                                  ? "Shift Totals"
                                  : "Check Log"}
                              </span>
                              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setDayViewMode("summary")}
                                  className={`h-6 px-2 text-[9px] font-bold uppercase tracking-wide rounded transition-colors ${
                                    dayViewMode === "summary"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  }`}
                                >
                                  Summary
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDayViewMode("table")}
                                  className={`h-6 px-2 text-[9px] font-bold uppercase tracking-wide rounded transition-colors ${
                                    dayViewMode === "table"
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  }`}
                                >
                                  Table
                                </button>
                              </div>
                            </div>

                            {dayViewMode === "table" && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-[10px] border-collapse">
                                  <thead>
                                    <tr className="bg-muted text-muted-foreground uppercase tracking-wide">
                                      <th className="p-1.5 border-b border-border text-center font-bold w-10">
                                        #
                                      </th>
                                      <th className="p-1.5 border-b border-border text-center font-bold whitespace-nowrap">
                                        Time
                                      </th>
                                      {TICK_COLUMNS.map((col) => (
                                        <th
                                          key={col.key as string}
                                          className="p-1.5 border-b border-border text-center font-bold"
                                        >
                                          {col.label}
                                        </th>
                                      ))}
                                      <th className="p-1.5 border-b border-border text-center font-bold">
                                        R Tank
                                      </th>
                                      <th className="p-1.5 border-b border-border text-center font-bold">
                                        L Tank
                                      </th>
                                      <th className="p-1.5 border-b border-border text-left font-bold">
                                        Notes
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dayChecks
                                      .slice()
                                      .sort((a, b) =>
                                        (a.start_time || "").localeCompare(
                                          b.start_time || "",
                                        ),
                                      )
                                      .map((check, idx) => (
                                        <tr
                                          key={cycleKey(check)}
                                          className="border-b border-border/60 hover:bg-accent/40 text-foreground"
                                        >
                                          <td className="p-1.5 text-center font-mono font-bold bg-muted/50 text-muted-foreground">
                                            {check.cycle_number ?? idx + 1}
                                          </td>
                                          <td className="p-1.5 text-center font-mono whitespace-nowrap">
                                            {check.start_time || "--:--"}
                                          </td>
                                          {TICK_COLUMNS.map((col) => (
                                            <td
                                              key={col.key as string}
                                              className="p-1.5 text-center"
                                            >
                                              {check[col.key] ? (
                                                <span className="text-success font-bold">
                                                  ✓
                                                </span>
                                              ) : (
                                                <span className="text-destructive font-bold">
                                                  ✗
                                                </span>
                                              )}
                                            </td>
                                          ))}
                                          <td className="p-1.5 text-center font-mono">
                                            {check.right_tank_level || "—"}
                                          </td>
                                          <td className="p-1.5 text-center font-mono">
                                            {check.left_tank_level || "—"}
                                          </td>
                                          <td
                                            className="p-1.5 text-muted-foreground"
                                            title={check.notes || undefined}
                                          >
                                            {check.notes || (
                                              <span className="text-muted-foreground/50 italic">
                                                None
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {dayViewMode === "summary" && (
                              <CardContent className="p-3 pt-2 space-y-3">
                                <div className="grid grid-cols-2 ipad:grid-cols-3 gap-2">
                                  <div className="border border-border rounded-md bg-muted/40 p-2 space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                      Product
                                    </p>
                                    <p className="text-sm font-black font-mono text-foreground">
                                      {day.product}
                                    </p>
                                  </div>
                                  <div className="border border-border rounded-md bg-muted/40 p-2 space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                      Batches Made
                                    </p>
                                    <p className="text-sm font-black font-mono text-foreground">
                                      {day.batchesMade}
                                    </p>
                                  </div>
                                  <div className="border border-border rounded-md bg-muted/40 p-2 space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                      # 30 Mesh Bags
                                    </p>
                                    <p className="text-sm font-black font-mono text-foreground">
                                      {day.bagsCount}
                                    </p>
                                  </div>
                                  <div className="border border-border rounded-md bg-muted/40 p-2 space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                      Tonnes
                                    </p>
                                    <p className="text-sm font-black font-mono text-foreground">
                                      {day.tonnes.toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="border border-border rounded-md bg-muted/40 p-2 space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                      Run Time
                                    </p>
                                    <p className="text-sm font-black font-mono text-foreground">
                                      {runTimeHours.toFixed(1)}hrs
                                    </p>
                                  </div>
                                  <div className="border border-border rounded-md bg-muted/40 p-2 space-y-0.5">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                      Avg Output P/H
                                    </p>
                                    <p className="text-sm font-black font-mono text-foreground">
                                      {day.averageOutputPH.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <div className="bg-accent-chip/50 rounded-md p-2 flex items-center justify-between text-[10px] font-semibold text-accent-ink border border-primary/20">
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                    <span>
                                      {day.totalChecks} Chemical/Tank Checks
                                      Logged
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            )}

                            {dayViewMode === "summary" &&
                              dayChecks.some(
                                (c) => c.notes && c.notes.trim() !== "",
                              ) && (
                                <div className="space-y-2 border-t border-border p-3 pt-2.5 bg-muted/30">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    Shift Remarks &amp; Fault Notes
                                  </span>

                                  <div className="grid grid-cols-1 gap-2">
                                    {dayChecks
                                      .filter(
                                        (check) =>
                                          check.notes &&
                                          check.notes.trim() !== "",
                                      )
                                      .map((check, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <span className="font-bold text-destructive inline-flex items-center gap-1 mr-1.5">
                                              ⚠️ Note:
                                            </span>
                                            <span className="text-foreground/80 font-medium break-words">
                                              {check.notes}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground bg-card border border-border/70 px-2 py-1 rounded-lg self-start shrink-0 shadow-xs">
                                            <Clock className="w-3 h-3" />
                                            <span className="font-bold text-foreground">
                                              {check.start_time || "--:--"}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                          </Card>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
