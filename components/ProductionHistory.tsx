"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderOpen,
  Layers,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface RawProductionLog {
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
  cycles: any[];
}

interface DayYield {
  dateString: string;
  shift: "Day" | "Night";
  operator: string;
  tables: Record<number, { matType: string; good: number; reject: number }>;
  totalCycles: number;
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

  const [expandedMonth, setExpandedMonth] = useState<string | null>(
    "July 2026",
  );
  const [expandedDay, setExpandedDay] = useState<string | null>("2026-07-09");

  useEffect(() => {
    setIsMounted(true);

    fetch("/rubbergem/data/data.json")
      .then((res) => {
        if (!res.ok)
          throw new Error("Failed to load production source records.");
        return res.json();
      })
      .then((rawLogs: RawProductionLog[]) => {
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

        rawLogs.forEach((log) => {
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

          const isNight = log.operator_shift.toLowerCase().includes("night");
          const cleanOperator = log.operator_shift.split("(")[0].trim();

          const tables: Record<
            number,
            { matType: string; good: number; reject: number }
          > = {
            1: {
              matType: log.table_line_output_yields.table_1.type,
              good: log.table_line_output_yields.table_1.good,
              reject: log.table_line_output_yields.table_1.reject,
            },
            2: {
              matType: log.table_line_output_yields.table_2.type,
              good: log.table_line_output_yields.table_2.good,
              reject: log.table_line_output_yields.table_2.reject,
            },
            3: {
              matType: log.table_line_output_yields.table_3.type,
              good: log.table_line_output_yields.table_3.good,
              reject: log.table_line_output_yields.table_3.reject,
            },
            4: {
              matType: log.table_line_output_yields.table_4.type,
              good: log.table_line_output_yields.table_4.good,
              reject: log.table_line_output_yields.table_4.reject,
            },
          };

          monthsMap[monthName].totalCycles += log.cycles.length;
          monthsMap[monthName].totalMats += log.total_mats_produced;
          monthsMap[monthName].days.push({
            dateString: log.date,
            shift: isNight ? "Night" : "Day",
            operator: cleanOperator,
            tables,
            totalCycles: log.cycles.length,
          });
        });

        const structuredList = Object.values(monthsMap).sort((a, b) => {
          return (
            new Date(b.days[0].dateString).getTime() -
            new Date(a.days[0].dateString).getTime()
          );
        });

        structuredList.forEach((m) => {
          m.days.sort(
            (a, b) =>
              new Date(b.dateString).getTime() -
              new Date(a.dateString).getTime(),
          );
        });

        setHistoricalData(structuredList);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed parsing production records.");
        setLoading(false);
      });
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
      <div className="w-full max-w-md mx-auto p-8 text-center text-xs font-semibold text-neutral-400">
        <Layers className="w-5 h-5 mx-auto mb-2 text-emerald-700 animate-spin" />
        <span>Parsing Extracted Production Logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto p-4 text-center border bg-red-50 text-red-700 rounded-xl text-xs font-bold">
        <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-3 space-y-4 pb-12 font-sans text-neutral-800">
      {/* Title Header Banner */}
      <div className="bg-emerald-800 text-white p-4 rounded-xl shadow-sm flex items-center gap-3">
        <Calendar className="w-5 h-5 text-emerald-300" />
        <div>
          <h1 className="text-lg font-bold tracking-wider uppercase">
            Production History
          </h1>
          <p className="text-[11px] text-emerald-200 leading-none">
            Nested Monthly Records & Line Yields
          </p>
        </div>
      </div>

      {/* Main Hierarchical Tree Container */}
      <div className="space-y-3">
        {historicalData.map((month) => {
          const isMonthOpen = expandedMonth === month.monthName;

          // Compute absolute monthly yield aggregations
          const monthFaulty = month.days.reduce((acc, d) => {
            return (
              acc + Object.values(d.tables).reduce((a, b) => a + b.reject, 0)
            );
          }, 0);

          const monthGood = month.days.reduce((acc, d) => {
            return (
              acc + Object.values(d.tables).reduce((a, b) => a + b.good, 0)
            );
          }, 0);

          return (
            <div key={month.monthName} className="space-y-1">
              {/* LEVEL 1: MONTH ACCORDION HEAD */}
              <button
                onClick={() => toggleMonth(month.monthName)}
                className={`w-full p-3.5 flex items-center justify-between rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                  isMonthOpen
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                    : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isMonthOpen ? (
                    <FolderOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                  <span>{month.monthName}</span>
                  <span className="normal-case text-[10px] font-sans font-medium text-neutral-400 ml-1">
                    (cycle:{month.totalCycles}{" "}
                    <span className="font-bold text-black">
                      mats:{month.totalMats}
                    </span>{" "}
                    <span className="text-green-600 font-semibold">
                      G:{monthGood}
                    </span>{" "}
                    <span className="text-red-600 font-semibold">
                      R:{monthFaulty}
                    </span>
                    )
                  </span>
                </div>
                {isMonthOpen ? (
                  <ChevronUp className="w-4 h-4 text-emerald-700" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {/* LEVEL 2: NESTED DAYS INSIDE THE MONTH */}
              {isMonthOpen && (
                <div className="pl-3 pr-1 py-1 space-y-2 border-l-2 border-emerald-100 ml-5">
                  {month.days.map((day) => {
                    const isDayOpen = expandedDay === day.dateString;

                    const totalGood = Object.values(day.tables).reduce(
                      (a, b) => a + b.good,
                      0,
                    );
                    const totalReject = Object.values(day.tables).reduce(
                      (a, b) => a + b.reject,
                      0,
                    );

                    return (
                      <div key={day.dateString} className="space-y-1">
                        {/* Day Line Header Toggle Trigger */}
                        <button
                          onClick={() => toggleDay(day.dateString)}
                          className={`w-full p-2.5 flex items-center justify-between text-left text-xs font-semibold rounded-lg border transition-all ${
                            isDayOpen
                              ? "bg-white border-neutral-300 text-neutral-900 shadow-sm"
                              : "bg-neutral-50/70 border-neutral-200/80 text-neutral-600 hover:bg-neutral-100/50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="block text-[11px] font-bold text-neutral-800">
                                {formatDateLabel(day.dateString)}
                              </span>
                              <span className="normal-case text-[10px] font-sans font-medium text-neutral-400">
                                (cycle:{day.totalCycles}{" "}
                                <span className="font-bold text-black">
                                  mats:{totalGood + totalReject}
                                </span>{" "}
                                <span className="text-green-600 font-semibold">
                                  G:{totalGood}
                                </span>{" "}
                                <span className="text-red-500 font-semibold">
                                  R:{totalReject}
                                </span>
                                )
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wide">
                              {day.shift} Shift • Operator: {day.operator}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDayOpen ? (
                              <ChevronUp className="w-4 h-4 text-neutral-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>
                        </button>

                        {/* LEVEL 3: PRODUCTION SHEET DATA GRID DISPLAY */}
                        {isDayOpen && (
                          <Card className="bg-white border-neutral-200 rounded-lg shadow-inner overflow-hidden mx-0.5 my-1">
                            <CardContent className="p-3 space-y-3">
                              <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-1.5">
                                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                                  Table Line Output Yields
                                </span>
                              </div>

                              {/* Grid Layout Components */}
                              <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map((tableId) => {
                                  const tableData = day.tables[tableId] || {
                                    matType: "---",
                                    good: 0,
                                    reject: 0,
                                  };
                                  return (
                                    <div
                                      key={tableId}
                                      className="border border-neutral-100 rounded-md bg-neutral-50/40 p-2 space-y-1"
                                    >
                                      <div className="flex justify-between items-center border-b border-neutral-100 pb-0.5">
                                        <span className="text-[11px] font-black font-mono text-neutral-800">
                                          TABLE {tableId}
                                        </span>
                                        <span className="bg-emerald-700 text-white font-bold text-[9px] px-1 py-0.2 rounded font-mono">
                                          {tableData.matType}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 text-center pt-0.5">
                                        <div className="border-r border-neutral-100/80">
                                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">
                                            Good
                                          </p>
                                          <p className="text-xs font-black font-mono text-emerald-700">
                                            {tableData.good}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">
                                            Reject
                                          </p>
                                          <p
                                            className={`text-xs font-black font-mono ${
                                              tableData.reject > 0
                                                ? "text-red-600 animate-pulse"
                                                : "text-neutral-400"
                                            }`}
                                          >
                                            {tableData.reject}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Yield Footer Context Details */}
                              <div className="bg-emerald-50/50 rounded-md p-2 flex items-center justify-between text-[10px] font-semibold text-emerald-900 border border-emerald-100/40">
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
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
                            </CardContent>
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
