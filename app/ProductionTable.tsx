"use client";

import { useEffect, useState } from "react";
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
  tableMatTypes: Record<number, string>;
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
}: {
  onBack?: () => void;
}) {
  const [entries, setEntries] = useState<CycleEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("production_cycles");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.sort(
          (a: CycleEntry, b: CycleEntry) => b.timestamp - a.timestamp,
        );
        setEntries(parsed);
      } catch (e) {
        console.error("Error parsing saved entries", e);
      }
    }
  }, []);

  const handlePrintPDF = () => {
    window.print();
  };

  // Reset log with warning verification
  const handleResetLog = () => {
    const isConfirmed = window.confirm(
      "CRITICAL WARNING: Are you sure you want to completely erase the current shift production log, form configurations, and metadata? This action cannot be undone.",
    );

    if (isConfirmed) {
      // 1. Wipe cycle entries history
      localStorage.removeItem("production_cycles");

      // 2. Wipe persistent meta & shift records
      localStorage.removeItem("terminal_press_number");
      localStorage.removeItem("shift_panel_open");
      localStorage.removeItem("shift_operator");
      localStorage.removeItem("shift_group");
      localStorage.removeItem("shift_mat_types");

      // 3. Wipe any active working draft cache lines
      localStorage.removeItem("ws_start_time");
      localStorage.removeItem("ws_end_time");
      localStorage.removeItem("ws_run_time");
      localStorage.removeItem("ws_load_time");
      localStorage.removeItem("ws_selected_squares");
      localStorage.removeItem("ws_bubble_checkboxes");
      localStorage.removeItem("ws_bubble_sizes");
      localStorage.removeItem("ws_notes");

      setEntries([]);
    }
  };

  const latestEntry = entries[0] || null;

  // Strict 15-row design structure
  const totalDisplayRows = 15;
  const rows = Array.from(
    { length: totalDisplayRows },
    (_, i) => entries[i] || null,
  );

  // Summary Metrics Calculations
  const activeEntriesCount = entries.length;
  const totalMatsProduced = activeEntriesCount * 4;

  // Compute the absolute sum of all entries' load times dynamically
  const accumulatedLoadTime = entries.reduce((total, entry) => {
    const time =
      typeof entry.loadTime === "number"
        ? entry.loadTime
        : parseFloat(entry.loadTime) || 0;
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

  return (
    <div className="w-full max-w-[1200px] mx-auto p-2 sm:p-4 space-y-3">
      {/* Strict Single Page Print Sheet Styles */}
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
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 gap-2 h-9 text-xs font-bold shadow-sm text-white"
          >
            <Trash2 className="w-4 h-4" /> Reset Shift Log
          </Button>
          <Button
            onClick={handlePrintPDF}
            className="bg-emerald-700 hover:bg-emerald-800 gap-2 h-9 text-xs font-bold shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print PDF
          </Button>
        </div>
      </div>

      {/* Main Document Content Area */}
      <Card className="shadow-sm border-neutral-200 overflow-hidden">
        {/* Core Sheet Title Banner */}
        <CardHeader className="bg-emerald-950 text-white p-3 header-compact">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold tracking-wider uppercase">
                Production Sheet Log
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

        {/* Global Shift Parameters Meta-Header Section */}
        <div className="bg-neutral-50 border-b border-neutral-200 p-2.5 space-y-2 meta-grid-compact">
          <div className="grid grid-cols-4 gap-2 text-xs text-neutral-700">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-neutral-200 meta-item-compact">
              <User className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 block leading-none">
                  Operator / Shift
                </span>
                <span className="font-bold text-neutral-950 text-xs">
                  {latestEntry?.operator || "—"}
                </span>
                <span className="text-[10px] text-neutral-500 capitalize ml-1">
                  ({latestEntry?.shift || "—"})
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
                  Press #{latestEntry?.pressNumber || "—"}
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
                  {latestEntry?.runTime ? `${latestEntry.runTime}m` : "—"}
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

          {/* Table Setup Banner Block */}
          <div className="bg-white p-1.5 rounded border border-neutral-200 flex items-center gap-3 text-xs meta-item-compact">
            <div className="flex items-center gap-1.5 text-emerald-800 shrink-0 border-r border-neutral-200 pr-3">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                Table Setup Mat Type:
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono font-bold text-neutral-800 text-[11px]">
              {[1, 2, 3, 4].map((id) => (
                <div key={id} className="text-xs">
                  T{id}:{" "}
                  <span className="text-emerald-700">
                    {latestEntry?.tableMatTypes?.[id] || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 15-Row Shift Cycle Data Grid */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse print-compact">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-200 text-neutral-600 text-[10px] uppercase tracking-wider font-bold">
                <th className="p-2 border-r border-neutral-200 text-center w-10">
                  Cycle
                </th>
                <th className="p-2 border-r border-neutral-200 text-center w-36">
                  Times (S/E / Load)
                </th>
                <th className="p-2 border-r border-neutral-200 text-center min-w-[8rem] whitespace-normal break-words px-3">
                  Short Mold Locations (1-4)
                </th>
                <th className="p-2 border-r border-neutral-200 text-center min-w-[8rem] whitespace-normal break-words px-3">
                  Bubbles Matrix (1-4)
                </th>
                <th className="p-2 w-full text-left">Fault Notes / Remarks</th>
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
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-300 font-mono font-bold bg-neutral-50/30">
                        {index + 1}
                      </td>
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-200 font-mono">
                        —
                      </td>
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-200 min-w-[12rem] whitespace-normal break-words">
                        -
                      </td>
                      <td className="p-1 border-r border-neutral-200 text-center text-neutral-200 min-w-[12rem] whitespace-normal break-words">
                        -
                      </td>
                      <td className="p-1 text-neutral-200 italic whitespace-normal break-words">
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
                      const locStr = locs.join(",");
                      const sizeStr = entry.bubbleSizes?.[id]
                        ? ` (${entry.bubbleSizes[id]})`
                        : "";
                      return `T${id}:[${locStr}]${sizeStr}`;
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
                    <td className="p-1 border-r border-neutral-200 text-center font-mono font-bold bg-neutral-50 text-neutral-500">
                      {index + 1}
                    </td>
                    <td className="p-1 border-r border-neutral-200 font-mono text-center text-[10px]">
                      <span className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-900 font-bold">
                        {entry.startTime || "--:--"}
                      </span>
                      <span className="mx-0.5 text-neutral-400">→</span>
                      <span className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-900 font-bold">
                        {entry.endTime || "--:--"}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-sans ml-1 font-semibold">
                        ({entry.loadTime || 0}m)
                      </span>
                    </td>
                    <td className="p-1 border-r border-neutral-200 text-center font-mono tracking-tight text-neutral-600 text-[10px] min-w-[12rem] whitespace-normal break-words">
                      {formatShortMolds()}
                    </td>
                    <td className="p-1 border-r border-neutral-200 text-center font-mono tracking-tight text-neutral-600 text-[10px] min-w-[12rem] whitespace-normal break-words">
                      {formatBubbles()}
                    </td>
                    <td
                      className="p-1 text-neutral-500 font-normal text-[10px] whitespace-normal break-words text-left"
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

      {/* Low-profile Production Summary Footer Cards */}
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
