"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Printer,
  Trash2,
  User,
  Cpu,
  Clock,
  Layers,
  Settings2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface CycleEntry {
  id: string;
  pressNumber: string;
  date: string;
  operator: string;
  shift: string;
  startTime: string;
  endTime: string;
  runTime: number | "";
  loadTime: number | "";
  tableMatTypes?: Record<number, string>;
  selectedTableSquares: Record<number, string>;
  bubbleCheckboxes: Record<
    number,
    { left: boolean; middle: boolean; right: boolean }
  >;
  bubbleSizes: Record<number, string>;
  notes: string;
  timestamp: number;
}

export default function ProductionTablePage({
  onBack,
  session,
}: {
  onBack?: () => void;
  session: any;
}) {
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [matTypes, setMatTypes] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [perthDate, setPerthDate] = useState<string>("");

  // Core data retrieval engine with explicit cache-busting headers
  const fetchLogs = async (showSpinner = false) => {
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("live_log")
        .select("*")
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Error fetching logs:", error);
        setFetchError(error.message);
        return;
      }

      if (data) {
        const transformed: CycleEntry[] = data.map((row: any) => {
          const parsedSquares: Record<number, string> = {};
          [1, 2, 3, 4].forEach((id) => {
            const tableData = row.short_mold_json?.[`table_${id}`];
            if (tableData && typeof tableData === "object") {
              if (tableData.position) {
                parsedSquares[id] = tableData.position;
              } else if (tableData.reject === 1) {
                parsedSquares[id] = "Short Mold";
              }
            } else if (row.short_mold_json?.[id]) {
              parsedSquares[id] = row.short_mold_json[id];
            }
          });

          return {
            id: row.live_id.toString(),
            pressNumber: "1",
            date: row.start_time
              ? new Date(row.start_time).toISOString().split("T")[0]
              : "---",
            operator: "N/A",
            shift: "N/A",
            startTime: row.start_time
              ? new Date(row.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--",
            endTime: row.end_time
              ? new Date(row.end_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--",
            runTime: 0,
            loadTime: Math.round((row.load_duration_seconds || 0) / 60),
            tableMatTypes: {},
            selectedTableSquares: parsedSquares,
            bubbleCheckboxes: row.bubble_json?.checks || {
              1: { left: false, middle: false, right: false },
              2: { left: false, middle: false, right: false },
              3: { left: false, middle: false, right: false },
              4: { left: false, middle: false, right: false },
            },
            bubbleSizes: row.bubble_json?.sizes || {},
            notes: row.notes || "",
            timestamp: row.start_time
              ? new Date(row.start_time).getTime()
              : Date.now(),
          };
        });
        setEntries(transformed);
      }
    } catch (err: any) {
      console.error("Unexpected fetch error:", err);
      setFetchError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial Access Fetch
    fetchLogs();

    // 2. Realtime listener sync channel
    const liveLogChannel = supabase
      .channel("production-page-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_log" },
        () => {
          fetchLogs();
        },
      )
      .subscribe();

    // Load configuration safely from local storage if initialized
    const savedMatTypes = localStorage.getItem("shift_mat_types");
    if (savedMatTypes) {
      try {
        setMatTypes(JSON.parse(savedMatTypes));
      } catch (e) {
        console.error("Failed to parse mat types", e);
      }
    }

    return () => {
      supabase.removeChannel(liveLogChannel);
    };
  }, []);

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Perth",
    }).format(new Date());

    setPerthDate(formatted);
  }, []);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleResetLog = async () => {
    const isConfirmed = window.confirm(
      "CRITICAL: This will archive the current shift to history and wipe the live log. Continue?",
    );

    if (isConfirmed) {
      try {
        const operator = localStorage.getItem("shift_operator") || "--";
        const shiftGroup = localStorage.getItem("shift_group") || "Day";
        const machinePress =
          "Press #" + (localStorage.getItem("terminal_press_number") || "1");

        const { error } = await supabase.rpc("reset_shift_log", {
          p_shift_id: 1,
          p_date: perthDate,
          p_machine_press: machinePress,
          p_operator_shift: `${operator} (${shiftGroup})`,
        });

        if (error) throw error;

        setEntries([]);
        localStorage.removeItem("shift_operator");
        localStorage.removeItem("shift_group");
        localStorage.removeItem("shift_run_time");

        alert("Shift archived and log cleared successfully.");
      } catch (err: any) {
        alert("Failed to reset shift: " + err.message);
      }
    }
  };

  // --- UI Computation Logic ---
  const latestEntry = entries[0] || null;
  const totalDisplayRows = 15;
  const rows = Array.from(
    { length: totalDisplayRows },
    (_, i) => entries[i] || null,
  );

  const activeEntriesCount = entries.length;
  const totalMatsProduced = activeEntriesCount * 4;

  const accumulatedLoadTime = entries.reduce((total, entry) => {
    const time =
      typeof entry.loadTime === "number"
        ? entry.loadTime
        : parseFloat(entry.loadTime as any) || 0;
    return total + time;
  }, 0);

  let faultyMatsProduced = 0;
  entries.forEach((entry) => {
    for (let id = 1; id <= 4; id++) {
      const hasShortMold = !!entry.selectedTableSquares?.[id];
      const b = entry.bubbleCheckboxes?.[id];
      const hasBubbles = !!(b?.left || b?.middle || b?.right);
      if (hasShortMold || hasBubbles) {
        faultyMatsProduced++;
      }
    }
  });

  const getTableStats = (id: number) => {
    let good = 0;
    let reject = 0;

    entries.forEach((entry) => {
      const hasShortMold = !!entry.selectedTableSquares?.[id];
      const b = entry.bubbleCheckboxes?.[id];
      const hasBubbles = !!(b?.left || b?.middle || b?.right);

      if (hasShortMold || hasBubbles) {
        reject++;
      } else {
        good++;
      }
    });

    return {
      matType: matTypes[id] || "—",
      good,
      reject,
    };
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-2 sm:p-4 space-y-3">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.2cm 0.3cm;
          }
          html,
          body {
            height: 100%;
            background: white;
            color: black;
            font-size: 10px;
            overflow: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-compact th {
            padding: 4px 5px !important;
            font-size: 10px !important;
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-compact td {
            padding: 3px 5px !important;
            font-size: 10px !important;
            min-height: 24px !important;
          }
          .shadow-sm {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
          }
          .header-compact {
            padding: 6px 10px !important;
          }
          .meta-grid-compact {
            padding: 6px !important;
            gap: 6px !important;
          }
          .meta-item-compact {
            padding: 4px 8px !important;
          }
          .footer-compact {
            padding: 6px 12px !important;
          }
        }
      `}</style>

      {/* Control Actions Panel */}
      <div className="flex items-center justify-between no-print bg-neutral-50 p-2 rounded-xl border border-neutral-200">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 h-9 text-neutral-600 text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleResetLog}
            disabled={!session}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 gap-2 h-9 text-xs font-bold shadow-sm text-white"
          >
            <Trash2 className="w-4 h-4" />
            {session ? "Reset Shift Log" : "Login to Reset"}
          </Button>
          <Button
            onClick={handlePrintPDF}
            className="bg-emerald-700 hover:bg-emerald-800 gap-2 h-9 text-xs font-bold shadow-sm text-white"
          >
            <Printer className="w-4 h-4" /> Print PDF
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {fetchError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-800 no-print">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Database Fetch Failed: </span>
            {fetchError}. Verify that RLS permissions are correct for the anon
            public role.
          </div>
        </div>
      )}

      {/* Main Document Content Area */}
      <Card className="shadow-sm border-neutral-200 overflow-hidden">
        <CardHeader className="bg-emerald-950 text-white p-3 header-compact">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold tracking-wider uppercase">
                Press Live Log Table
              </CardTitle>
              <p className="text-[10px] text-emerald-300">
                Shift Execution & Defect Matrix
              </p>
            </div>
            <div className="text-[10px] bg-emerald-900 border border-emerald-800 px-2.5 py-0.5 rounded font-mono">
              Date: {latestEntry?.date || "---"}
            </div>
          </div>
        </CardHeader>

        {/* Metadata Strip */}
        <div className="bg-neutral-50 border-b border-neutral-200 p-2.5 space-y-2.5 meta-grid-compact">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-neutral-700">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-neutral-200 meta-item-compact">
              <User className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 block leading-none">
                  Operator / Shift
                </span>
                <span className="font-bold text-neutral-950 text-xs">
                  {typeof window !== "undefined"
                    ? localStorage.getItem("shift_operator") || "Remote Screen"
                    : "—"}
                </span>
                <span className="text-[10px] text-neutral-500 capitalize ml-1">
                  (
                  {typeof window !== "undefined"
                    ? localStorage.getItem("shift_group") || "View"
                    : "—"}
                  )
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-neutral-200 meta-item-compact">
              <Cpu className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 block leading-none">
                  Machine Press
                </span>
                <span className="font-extrabold text-emerald-800 text-xs">
                  Press #
                  {typeof window !== "undefined"
                    ? localStorage.getItem("terminal_press_number") || "1"
                    : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-neutral-200 meta-item-compact">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 block leading-none">
                  Target Run Time
                </span>
                <span className="font-bold text-neutral-950 text-xs">
                  {typeof window !== "undefined" &&
                  localStorage.getItem("shift_run_time")
                    ? `${localStorage.getItem("shift_run_time")}m`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-neutral-200 meta-item-compact">
              <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 block leading-none">
                  Accumulated Load Time
                </span>
                <span className="font-bold text-neutral-950 text-xs">
                  {accumulatedLoadTime > 0 ? `${accumulatedLoadTime}m` : "0m"}
                </span>
              </div>
            </div>
          </div>

          {/* Table Line Yield Status Strip */}
          <div className="bg-white p-2 rounded border border-neutral-200 flex flex-col md:flex-row md:items-center gap-2.5 text-xs meta-item-compact">
            <div className="flex items-center gap-1.5 text-emerald-800 shrink-0 md:border-r border-neutral-200 md:pr-3">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                Table Line Output Yields:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
              {[1, 2, 3, 4].map((id) => {
                const stats = getTableStats(id);
                return (
                  <div
                    key={id}
                    className="bg-neutral-50/50 border border-neutral-200/70 rounded-md p-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-neutral-400 uppercase leading-none mb-1">
                        Table {id}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/80">
                        {stats.matType}
                      </span>
                    </div>
                    <div className="flex flex-col items-end text-[10px] font-bold gap-0.5 shrink-0">
                      <span className="text-emerald-700 bg-emerald-100/30 px-1.5 py-0.5 rounded font-mono">
                        G: {stats.good}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono ${stats.reject > 0 ? "text-red-600 bg-red-100/30" : "text-neutral-400 bg-neutral-100"}`}
                      >
                        R: {stats.reject}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 15-Row Shift Cycle Data Grid */}
        <CardContent className="p-0 overflow-x-auto relative">
          {isLoading && entries.length === 0 && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10 p-12 gap-2 text-xs font-semibold text-neutral-500">
              <Loader2 className="w-4 h-4 text-emerald-700 animate-spin" />{" "}
              Fetching raw matrix logs...
            </div>
          )}

          <table className="w-full text-left border-collapse print-compact min-w-[700px]">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-200 text-neutral-600 text-[10px] uppercase tracking-wider font-bold">
                <th className="p-2 border-r border-neutral-200 text-center w-[45px]">
                  Cycle
                </th>
                <th className="p-2 border-r border-neutral-200 text-center w-[140px]">
                  Times (S/E / Load)
                </th>
                <th className="p-2 border-r border-neutral-200 text-center min-w-[160px] px-3">
                  Short Mold Locations
                </th>
                <th className="p-2 border-r border-neutral-200 text-center min-w-[150px] px-3">
                  Bubbles Matrix
                </th>
                <th className="p-2 min-w-[200px] text-left">
                  Fault Notes / Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-[11px]">
              {rows.map((entry, index) => {
                if (!entry) {
                  return (
                    <tr
                      key={`filler-${index}`}
                      className="min-h-[25px] bg-white"
                    >
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-300 font-mono font-bold bg-neutral-50/30 w-[45px]">
                        {index + 1}
                      </td>
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-200 font-mono w-[140px]">
                        —
                      </td>
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-200 min-w-[160px]">
                        -
                      </td>
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-200 min-w-[150px]">
                        -
                      </td>
                      <td className="p-1 text-neutral-200 italic min-w-[200px]">
                        -
                      </td>
                    </tr>
                  );
                }

                const formatShortMolds = () => {
                  const activeMolds = [1, 2, 3, 4]
                    .filter((id) => entry.selectedTableSquares?.[id])
                    .map((id) => `T${id}: ${entry.selectedTableSquares[id]}`);
                  return activeMolds.length > 0 ? activeMolds.join(" | ") : "-";
                };

                const formatBubbles = () => {
                  const activeBubbles = [1, 2, 3, 4]
                    .filter((id) => {
                      const b = entry.bubbleCheckboxes?.[id];
                      return b?.left || b?.middle || b?.right;
                    })
                    .map((id) => {
                      const b = entry.bubbleCheckboxes?.[id];
                      const locs = [];
                      if (b?.left) locs.push("L");
                      if (b?.middle) locs.push("M");
                      if (b?.right) locs.push("R");
                      const sizeStr = entry.bubbleSizes?.[id]
                        ? ` (${entry.bubbleSizes[id]})`
                        : "";
                      return `T${id}:[${locs.join(",")}]${sizeStr}`;
                    });
                  return activeBubbles.length > 0
                    ? activeBubbles.join(" | ")
                    : "-";
                };

                return (
                  <tr
                    key={entry.id}
                    className="min-h-[25px] hover:bg-neutral-50/50 text-neutral-800 font-medium"
                  >
                    <td className="p-1 border-r border-neutral-200 text-center font-mono font-bold bg-neutral-50 text-neutral-500 w-[45px]">
                      {index + 1}
                    </td>
                    <td className="p-1 border-r border-neutral-200 font-mono text-center text-[10px] w-[140px] whitespace-nowrap">
                      <span className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-900 font-bold">
                        {entry.startTime}
                      </span>
                      <span className="mx-0.5 text-neutral-400">→</span>
                      <span className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-900 font-bold">
                        {entry.endTime}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-sans ml-1 font-semibold">
                        ({entry.loadTime}m)
                      </span>
                    </td>
                    <td className="p-1 border-r border-neutral-200 text-center font-mono tracking-tight text-neutral-600 text-[10px] min-w-[160px]">
                      {formatShortMolds()}
                    </td>
                    <td className="p-1 border-r border-neutral-200 text-center font-mono tracking-tight text-neutral-600 text-[10px] min-w-[150px]">
                      {formatBubbles()}
                    </td>
                    <td
                      className="p-1 text-neutral-500 font-normal text-[10px] min-w-[200px] text-left"
                      title={entry.notes}
                    >
                      {entry.notes || (
                        <span className="text-neutral-200 italic">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Production Summary Footer Cards */}
      <div className="grid grid-cols-2 gap-3 pt-0.5">
        <div className="bg-white border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm footer-compact">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900">
                Total Mats Produced
              </h3>
              <p className="text-[9px] text-neutral-400 font-medium">
                Calculated: {activeEntriesCount} active cycles × 4 tables
              </p>
            </div>
          </div>
          <div className="text-lg font-black font-mono text-emerald-800">
            {totalMatsProduced}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between shadow-sm footer-compact">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-50 text-red-600">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900">
                Faulty Mats Produced
              </h3>
              <p className="text-[9px] text-neutral-400 font-medium">
                Max 1 defect count per table per cycle frame
              </p>
            </div>
          </div>
          <div
            className={`text-lg font-black font-mono ${faultyMatsProduced > 0 ? "text-red-600" : "text-neutral-400"}`}
          >
            {faultyMatsProduced}
          </div>
        </div>
      </div>
    </div>
  );
}
