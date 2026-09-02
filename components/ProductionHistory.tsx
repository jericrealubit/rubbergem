"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Ensure this import matches your project setup
import {
  shiftGroupOf,
  cycleKey,
  formatShortMolds,
  type ArchivedCycle,
} from "@/lib/shift-log";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Folder,
  FolderOpen,
  Layers,
  TrendingUp,
} from "lucide-react";

interface RawProductionLog {
  id: number;
  date: string;
  machine_press: string;
  operator_shift: string;
  target_run_time_minutes: number;
  accumulated_load_time_minutes: number;
  total_mats_produced: number;
  faulty_mats_produced: number;
  table_line_output_yields: {
    table_1: { type: string; good: number; reject: number };
    table_2: { type: string; good: number; reject: number };
    table_3: { type: string; good: number; reject: number };
    table_4: { type: string; good: number; reject: number };
  };
  cycles: ArchivedCycle[];
}

interface DayYield {
  id: number;
  dateString: string;
  shift: "Day" | "Night";
  operator: string;
  tables: Record<number, { matType: string; good: number; reject: number }>;
  totalCycles: number;
  cycles: ArchivedCycle[]; // <-- FIX 1: Added cycles array to interface
}

interface MonthGroup {
  monthName: string;
  totalCycles: number;
  totalMats: number;
  days: DayYield[];
}

export default function ProductionHistory() {
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

    async function fetchProductionData() {
      try {
        setLoading(true);
        // Fetching from 'production_logs' table
        const { data, error } = await supabase
          .from("production_logs")
          .select("*")
          .order("date", { ascending: false });

        if (error) throw error;

        const rawLogs: RawProductionLog[] = data || [];
        const monthsMap: Record<string, MonthGroup> = {};
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        // A shift is one record per day: collapse any duplicate rows for the
        // same (date, shift group) down to a single entry before rendering.
        // Older rows predate the DB-backed row resolution in PressForm.tsx and
        // can still be duplicated (a second terminal, a cleared browser store
        // or a mid-shift reset each used to insert a fresh row) — keep the
        // richest one, i.e. the most cycles, newest id breaking a tie.
        const shiftsMap = new Map<string, RawProductionLog>();
        rawLogs.forEach((log) => {
          const key = `${log.date}|${shiftGroupOf(log.operator_shift)}`;
          const held = shiftsMap.get(key);
          if (!held) {
            shiftsMap.set(key, log);
            return;
          }

          const heldCycles = Array.isArray(held.cycles) ? held.cycles.length : 0;
          const logCycles = Array.isArray(log.cycles) ? log.cycles.length : 0;
          if (
            logCycles > heldCycles ||
            (logCycles === heldCycles && log.id > held.id)
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
              totalCycles: 0,
              totalMats: 0,
              days: [],
            };
          }

          const isNight = shiftGroupOf(log.operator_shift) === "night";
          const cleanOperator = log.operator_shift.split("(")[0].trim();

          const tables: Record<
            number,
            { matType: string; good: number; reject: number }
          > = {
            1: {
              matType: log.table_line_output_yields?.table_1?.type || "—",
              good: log.table_line_output_yields?.table_1?.good || 0,
              reject: log.table_line_output_yields?.table_1?.reject || 0,
            },
            2: {
              matType: log.table_line_output_yields?.table_2?.type || "—",
              good: log.table_line_output_yields?.table_2?.good || 0,
              reject: log.table_line_output_yields?.table_2?.reject || 0,
            },
            3: {
              matType: log.table_line_output_yields?.table_3?.type || "—",
              good: log.table_line_output_yields?.table_3?.good || 0,
              reject: log.table_line_output_yields?.table_3?.reject || 0,
            },
            4: {
              matType: log.table_line_output_yields?.table_4?.type || "—",
              good: log.table_line_output_yields?.table_4?.good || 0,
              reject: log.table_line_output_yields?.table_4?.reject || 0,
            },
          };

          const cyclesArray = Array.isArray(log.cycles) ? log.cycles : [];

          monthsMap[monthName].totalCycles += cyclesArray.length;
          monthsMap[monthName].totalMats += log.total_mats_produced || 0;
          monthsMap[monthName].days.push({
            id: log.id,
            dateString: log.date,
            shift: isNight ? "Night" : "Day",
            operator: cleanOperator,
            tables,
            totalCycles: cyclesArray.length,
            cycles: cyclesArray, // <-- FIX 2: Preserved cycles mapping to day level
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
            // Same date, different shift group: newest first, so Night
            // (which runs later) sits above Day.
            return a.shift === b.shift ? 0 : a.shift === "Night" ? -1 : 1;
          });
        });

        setHistoricalData(structuredList);
      } catch (err: any) {
        console.error("Error fetching production_logs:", err);
        setError(err.message || "Failed parsing production records.");
      } finally {
        setLoading(false);
      }
    }

    fetchProductionData();
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
        <span>Parsing Extracted Production Logs...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md ipad:max-w-3xl mx-auto p-3 ipad:p-4 space-y-4 pb-12 font-sans text-foreground">
      <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-sm flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary-foreground/70" />
        <div>
          <h1 className="text-lg font-bold tracking-wider uppercase">
            Press Production History
          </h1>
          <p className="text-[11px] text-primary-foreground/80 leading-none">
            Nested Monthly Records & Line Yields
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Database Fetch Failed: </span>
            {error}. Verify that RLS SELECT permissions are correct for
            production_logs.
          </div>
        </div>
      )}

      <div className="space-y-3">
        {historicalData.map((month) => {
          const isMonthOpen = expandedMonth === month.monthName;
          const monthFaulty = month.days.reduce(
            (acc, d) =>
              acc + Object.values(d.tables).reduce((a, b) => a + b.reject, 0),
            0,
          );
          const monthGood = month.days.reduce(
            (acc, d) =>
              acc + Object.values(d.tables).reduce((a, b) => a + b.good, 0),
            0,
          );

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
                    (cycle:{month.totalCycles}{" "}
                    <span className="font-bold text-foreground">
                      mats:{month.totalMats}
                    </span>{" "}
                    <span className="text-success font-semibold">
                      G:{monthGood}
                    </span>{" "}
                    <span className="text-destructive font-semibold">
                      R:{monthFaulty}
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
                    // Includes the row id so two entries can never collide on
                    // a React key or expand/collapse in lockstep.
                    const keyForDay = `${day.dateString}-${day.shift}-${day.id}`;
                    const isDayOpen = expandedDay === keyForDay;
                    const totalGood = Object.values(day.tables).reduce(
                      (a, b) => a + b.good,
                      0,
                    );
                    const totalReject = Object.values(day.tables).reduce(
                      (a, b) => a + b.reject,
                      0,
                    );

                    const DEFAULT_LOAD_TIME_MINUTES = 17;
                    const dayCycles = Array.isArray(day.cycles)
                      ? day.cycles
                      : [];
                    const accumulatedLoadTime = dayCycles.reduce(
                      (sum, c: any) =>
                        sum + (c.load_duration_seconds || 0) / 60,
                      0,
                    );
                    const totalDowntime = dayCycles.reduce(
                      (sum, c: any) =>
                        sum +
                        Math.max(
                          0,
                          (c.load_duration_seconds || 0) / 60 -
                            DEFAULT_LOAD_TIME_MINUTES,
                        ),
                      0,
                    );

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
                                (cycle:{day.totalCycles}{" "}
                                <span className="font-bold text-foreground">
                                  mats:{totalGood + totalReject}
                                </span>{" "}
                                <span className="text-success font-semibold">
                                  G:{totalGood}
                                </span>{" "}
                                <span className="text-destructive font-semibold">
                                  R:{totalReject}
                                </span>
                                )
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
                              {day.shift} Shift • Operator: {day.operator}
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
                                <Layers className="w-3.5 h-3.5 text-primary" />
                                {dayViewMode === "summary"
                                  ? "Table Line Output Yields"
                                  : "Cycle Log"}
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
                                        Start → End (Load)
                                      </th>
                                      <th className="p-1.5 border-b border-border text-center font-bold w-16">
                                        Runtime
                                      </th>
                                      <th className="p-1.5 border-b border-border text-left font-bold">
                                        Short Mold
                                      </th>
                                      <th className="p-1.5 border-b border-border text-left font-bold">
                                        Notes
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dayCycles
                                      .slice()
                                      .sort((a, b) =>
                                        (a.start_time || "").localeCompare(
                                          b.start_time || "",
                                        ),
                                      )
                                      .map((cycle, idx) => (
                                        <tr
                                          key={cycleKey(cycle)}
                                          className="border-b border-border/60 hover:bg-accent/40 text-foreground"
                                        >
                                          <td className="p-1.5 text-center font-mono font-bold bg-muted/50 text-muted-foreground">
                                            {cycle.cycle_number ?? idx + 1}
                                          </td>
                                          <td className="p-1.5 text-center font-mono whitespace-nowrap">
                                            {cycle.start_time || "--:--"}
                                            <span className="mx-0.5 text-muted-foreground">
                                              →
                                            </span>
                                            {cycle.end_time || "--:--"}
                                            <span className="ml-1 text-muted-foreground">
                                              (
                                              {Math.round(
                                                (cycle.load_duration_seconds ||
                                                  0) / 60,
                                              )}
                                              m)
                                            </span>
                                          </td>
                                          <td className="p-1.5 text-center font-mono">
                                            {cycle.run_time_minutes ?? "-"}
                                          </td>
                                          <td className="p-1.5 font-mono tracking-tight text-muted-foreground">
                                            {formatShortMolds(cycle)}
                                          </td>
                                          <td
                                            className="p-1.5 text-muted-foreground"
                                            title={cycle.notes || undefined}
                                          >
                                            {cycle.notes || (
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
                              <div className="grid grid-cols-2 ipad:grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((tableId) => {
                                  const tableData = day.tables[tableId] || {
                                    matType: "---",
                                    good: 0,
                                    reject: 0,
                                  };
                                  return (
                                    <div
                                      key={tableId}
                                      className="border border-border rounded-md bg-muted/40 p-2 space-y-1"
                                    >
                                      <div className="flex justify-between items-center border-b border-border pb-0.5">
                                        <span className="text-[11px] font-black font-mono text-foreground">
                                          TABLE {tableId}
                                        </span>
                                        <span className="bg-primary text-primary-foreground font-bold text-[9px] px-1 py-0.2 rounded font-mono">
                                          {tableData.matType}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 text-center pt-0.5">
                                        <div className="border-r border-border/80">
                                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                            Good
                                          </p>
                                          <p className="text-xs font-black font-mono text-primary">
                                            {tableData.good}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                            Reject
                                          </p>
                                          <p
                                            className={`text-xs font-black font-mono ${tableData.reject > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}
                                          >
                                            {tableData.reject}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="bg-accent-chip/50 rounded-md p-2 flex items-center justify-between text-[10px] font-semibold text-accent-ink border border-primary/20">
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                  <span>
                                    {day.totalCycles} Total Framing Cycles
                                    logged
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] font-bold">
                                  Yield Ratio:{" "}
                                  {totalGood + totalReject > 0
                                    ? (
                                        (totalGood /
                                          (totalGood + totalReject)) *
                                        100
                                      ).toFixed(0)
                                    : 0}
                                  %
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="border border-border rounded-md bg-muted/40 p-2 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none">
                                      Accumulated Load Time
                                    </p>
                                    <p className="text-xs font-black font-mono text-foreground">
                                      {Math.round(accumulatedLoadTime)}m
                                    </p>
                                  </div>
                                </div>
                                <div className="border border-border rounded-md bg-muted/40 p-2 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none">
                                      Total Downtime(Load:17m)
                                    </p>
                                    <p className="text-xs font-black font-mono text-destructive">
                                      {Math.round(totalDowntime)}m
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            )}

                            {/* --- FIX 3: Replaced "log.cycles" with "day.cycles" and added inline card padding layout --- */}
                            {dayViewMode === "summary" &&
                              day.cycles &&
                              Array.isArray(day.cycles) &&
                              day.cycles.some(
                                (c) => c.notes && c.notes.trim() !== "",
                              ) && (
                                <div className="space-y-2 border-t border-border p-3 pt-2.5 bg-muted/30">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    Shift Remarks & Fault Notes
                                  </span>

                                  <div className="grid grid-cols-1 gap-2">
                                    {day.cycles
                                      .filter(
                                        (cycle: any) =>
                                          cycle.notes &&
                                          cycle.notes.trim() !== "",
                                      )
                                      .map((cycle: any, idx: number) => {
                                        // Convert the stored run_duration_seconds into a readable minute format
                                        const durationDisplay =
                                          cycle.run_duration_seconds
                                            ? `${Math.round(cycle.run_duration_seconds / 60)}m`
                                            : "—";

                                        return (
                                          <div
                                            key={idx}
                                            className="bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                                          >
                                            {/* Left Side: The Note Content */}
                                            <div className="flex-1 min-w-0">
                                              <span className="font-bold text-destructive inline-flex items-center gap-1 mr-1.5">
                                                ⚠️ Note:
                                              </span>
                                              <span className="text-foreground/80 font-medium break-words">
                                                {cycle.notes}
                                              </span>
                                            </div>

                                            {/* Right Side: Timeline Details Badge */}
                                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground bg-card border border-border/70 px-2 py-1 rounded-lg self-start shrink-0 shadow-xs">
                                              <span className="font-bold text-foreground">
                                                {cycle.start_time || "--:--"}
                                              </span>
                                              <span className="text-muted-foreground/60">
                                                →
                                              </span>
                                              <span className="font-bold text-foreground">
                                                {cycle.end_time || "--:--"}
                                              </span>
                                              <span className="text-muted-foreground ml-0.5 bg-muted px-1.5 py-0.5 rounded border border-border">
                                                {durationDisplay}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
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
