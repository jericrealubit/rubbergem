"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shiftGroupOf } from "@/lib/bales-log";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Folder,
  FolderOpen,
  Hash,
  Layers,
  TrendingUp,
} from "lucide-react";

interface RawBalesProductionLog {
  id: number;
  date: string;
  operator_shift: string;
  cycles: any[];
  total_bales_produced: number;
  total_faulty_bales: number;
  total_run_time_minutes: number;
  main_issues_faults: string | null;
}

interface DayBalesSummary {
  id: number;
  dateString: string;
  shift: "Day" | "Night";
  operator: string;
  totalCycles: number;
  totalBalesProduced: number;
  totalFaultyBales: number;
  totalRunTimeMinutes: number;
  mainIssuesFaults: string;
  cycles: any[];
}

interface MonthGroup {
  monthName: string;
  totalCycles: number;
  totalBales: number;
  totalFaulty: number;
  days: DayBalesSummary[];
}

export default function BalesHistory() {
  const [historicalData, setHistoricalData] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [expandedMonth, setExpandedMonth] = useState<string | null>("");
  const [expandedDay, setExpandedDay] = useState<string | null>("");

  useEffect(() => {
    setIsMounted(true);

    async function fetchBalesProductionData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("bales_production_logs")
          .select("*")
          .order("date", { ascending: false });

        if (error) throw error;

        const rawLogs: RawBalesProductionLog[] = data || [];
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

        // Same one-row-per-(date, shift group) collapse ProductionHistory.tsx
        // does for Press: keep the richest row (most cycles, newest id
        // breaking a tie) if duplicates ever exist.
        const shiftsMap = new Map<string, RawBalesProductionLog>();
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
              totalBales: 0,
              totalFaulty: 0,
              days: [],
            };
          }

          const isNight = shiftGroupOf(log.operator_shift) === "night";
          const cleanOperator = log.operator_shift.split("(")[0].trim();
          const cyclesArray = Array.isArray(log.cycles) ? log.cycles : [];

          monthsMap[monthName].totalCycles += cyclesArray.length;
          monthsMap[monthName].totalBales += log.total_bales_produced || 0;
          monthsMap[monthName].totalFaulty += log.total_faulty_bales || 0;
          monthsMap[monthName].days.push({
            id: log.id,
            dateString: log.date,
            shift: isNight ? "Night" : "Day",
            operator: cleanOperator,
            totalCycles: cyclesArray.length,
            totalBalesProduced: log.total_bales_produced || 0,
            totalFaultyBales: log.total_faulty_bales || 0,
            totalRunTimeMinutes: log.total_run_time_minutes || 0,
            mainIssuesFaults: log.main_issues_faults || "",
            cycles: cyclesArray,
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
        console.error("Error fetching bales_production_logs:", err);
        setError(err.message || "Failed parsing bales production records.");
      } finally {
        setLoading(false);
      }
    }

    fetchBalesProductionData();
  }, []);

  const toggleMonth = (monthName: string) => {
    setExpandedMonth(expandedMonth === monthName ? null : monthName);
  };

  const toggleDay = (dateString: string) => {
    setExpandedDay(expandedDay === dateString ? null : dateString);
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
        <span>Parsing Extracted Bales Production Logs...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md ipad:max-w-3xl mx-auto p-3 ipad:p-4 space-y-4 pb-12 font-sans text-foreground">
      <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-sm flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary-foreground/70" />
        <div>
          <h1 className="text-lg font-bold tracking-wider uppercase">
            Bales Production History
          </h1>
          <p className="text-[11px] text-primary-foreground/80 leading-none">
            Nested Monthly Records &amp; Line Totals
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Database Fetch Failed: </span>
            {error}. Verify that RLS SELECT permissions are correct for
            bales_production_logs.
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
                    (cycles:{month.totalCycles}{" "}
                    <span className="font-bold text-foreground">
                      bales:{month.totalBales}
                    </span>{" "}
                    <span className="text-destructive font-semibold">
                      faulty:{month.totalFaulty}
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
                    const yieldRatio =
                      day.totalBalesProduced > 0
                        ? Math.round(
                            ((day.totalBalesProduced - day.totalFaultyBales) /
                              day.totalBalesProduced) *
                              100,
                          )
                        : 0;
                    const dayCycles = Array.isArray(day.cycles)
                      ? day.cycles
                      : [];

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
                                (cycles:{day.totalCycles}{" "}
                                <span className="font-bold text-foreground">
                                  bales:{day.totalBalesProduced}
                                </span>{" "}
                                <span className="text-destructive font-semibold">
                                  faulty:{day.totalFaultyBales}
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
                            <CardContent className="p-3 space-y-3">
                              <div className="flex items-center gap-1.5 border-b border-border pb-1.5">
                                <Layers className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                  Shift Totals
                                </span>
                              </div>

                              <div className="grid grid-cols-2 ipad:grid-cols-4 gap-2">
                                <div className="border border-border rounded-md bg-muted/40 p-2 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <div>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none">
                                      Bales Produced
                                    </p>
                                    <p className="text-xs font-black font-mono text-primary">
                                      {day.totalBalesProduced}
                                    </p>
                                  </div>
                                </div>
                                <div className="border border-border rounded-md bg-muted/40 p-2 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                                  <div>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none">
                                      Faulty Bales
                                    </p>
                                    <p
                                      className={`text-xs font-black font-mono ${day.totalFaultyBales > 0 ? "text-destructive" : "text-muted-foreground"}`}
                                    >
                                      {day.totalFaultyBales}
                                    </p>
                                  </div>
                                </div>
                                <div className="border border-border rounded-md bg-muted/40 p-2 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none">
                                      Total Run Time
                                    </p>
                                    <p className="text-xs font-black font-mono text-foreground">
                                      {Math.round(day.totalRunTimeMinutes)}m
                                    </p>
                                  </div>
                                </div>
                                <div className="border border-border rounded-md bg-muted/40 p-2 flex items-center gap-1.5">
                                  <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none">
                                      Cycles Logged
                                    </p>
                                    <p className="text-xs font-black font-mono text-foreground">
                                      {day.totalCycles}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-accent-chip/50 rounded-md p-2 flex items-center justify-between text-[10px] font-semibold text-accent-ink border border-primary/20">
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                  <span>
                                    {day.totalCycles} Total Bag Cycles Logged
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] font-bold">
                                  Yield Ratio: {yieldRatio}%
                                </span>
                              </div>

                              {day.mainIssuesFaults && (
                                <div className="bg-warning/10 border border-warning/30 rounded-md p-2.5 flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-warning mb-0.5">
                                      Main Issues / Faults
                                    </p>
                                    <p className="text-xs text-foreground/80 font-medium break-words">
                                      {day.mainIssuesFaults}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </CardContent>

                            {dayCycles.some(
                              (c) => c.notes && c.notes.trim() !== "",
                            ) && (
                              <div className="space-y-2 border-t border-border p-3 pt-2.5 bg-muted/30">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Cycle Notes / Fault Log
                                </span>

                                <div className="grid grid-cols-1 gap-2">
                                  {dayCycles
                                    .filter(
                                      (cycle: any) =>
                                        cycle.notes &&
                                        cycle.notes.trim() !== "",
                                    )
                                    .map((cycle: any, idx: number) => {
                                      const durationDisplay =
                                        cycle.run_time_minutes != null
                                          ? `${cycle.run_time_minutes}m`
                                          : "—";

                                      return (
                                        <div
                                          key={idx}
                                          className="bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <span className="font-bold text-destructive inline-flex items-center gap-1 mr-1.5">
                                              ⚠️ Note:
                                            </span>
                                            <span className="text-foreground/80 font-medium break-words">
                                              {cycle.notes}
                                            </span>
                                          </div>

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
