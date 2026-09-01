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

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// isoDate is already Perth-local YYYY-MM-DD; split it directly instead of
// re-parsing via `new Date(...)`, which reinterprets it as UTC and can shift
// the displayed day depending on the browser's local offset.
const formatDateShort = (isoDate: string) => {
  const [, month, day] = isoDate.split("-");
  const monthIndex = Number(month) - 1;
  return MONTH_ABBR[monthIndex] ? `${MONTH_ABBR[monthIndex]}-${day}` : isoDate;
};

interface CycleEntry {
  id: string;
  cycleNumber: number;
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
  const [isResetting, setIsResetting] = useState(false);
  const [shiftConfig, setShiftConfig] = useState<{
    operator: string;
    shift_group: string;
    press_number: string;
    run_time_minutes: number | null;
    mat_types: Record<number, string>;
  } | null>(null);

  // Current shift setup, shared via the DB so any viewer (e.g. the boss on a
  // remote screen) sees the live operator / shift / press / run time / mat types.
  const fetchShiftConfig = async () => {
    const { data } = await supabase
      .from("shift_config")
      .select("*")
      .eq("shift_id", 1)
      .maybeSingle();
    if (data) {
      setShiftConfig(data as any);
      setMatTypes(data.mat_types || {});
    }
  };

  // Core data retrieval engine with explicit cache-busting headers
  const fetchLogs = async (showSpinner = false) => {
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("live_log")
        .select("*")
        .order("cycle_number", { ascending: true });

      if (error) {
        console.error("Error fetching logs:", error);
        setFetchError(error.message);
        return;
      }

      if (data) {
        const transformed: CycleEntry[] = data.map((row: any, index: number) => {
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
            cycleNumber: row.cycle_number ?? index + 1,
            pressNumber: "1",
            date: row.start_time
              ? new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Australia/Perth",
                }).format(new Date(row.start_time))
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
            runTime: row.run_time_minutes ?? "",
            loadTime: Math.round((row.load_duration_seconds || 0) / 60),
            tableMatTypes: {},
            selectedTableSquares: parsedSquares,
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
    fetchShiftConfig();

    // 2. Realtime listener sync channel (cycles)
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

    // 3. Realtime listener for the shared shift setup
    const shiftConfigChannel = supabase
      .channel("shift-config-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_config" },
        () => {
          fetchShiftConfig();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(liveLogChannel);
      supabase.removeChannel(shiftConfigChannel);
    };
  }, []);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleResetLog = async () => {
    const isConfirmed = window.confirm(
      "This will clear the live log. The shift is already saved to history — a new shift will start a fresh history entry. Continue?",
    );

    if (!isConfirmed) return;

    setIsResetting(true);
    try {
      const { error } = await supabase.rpc("reset_shift_log", {
        p_shift_id: "1",
      });

      if (error) throw error;

      // Verify the delete actually happened. Postgres doesn't error on a
      // DELETE that matches 0 rows (e.g. if RLS silently filters it), so
      // without this check a permissions regression would look like success.
      const { count, error: verifyError } = await supabase
        .from("live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);

      if (verifyError) throw verifyError;
      if (count && count > 0) {
        throw new Error(
          "Live log still has rows after reset — check the reset_shift_log RLS/permissions in Supabase.",
        );
      }

      // Clear the shared shift board so it doesn't show a stale operator.
      // Keep press_number / mat_types (persist across shifts, like localStorage).
      await supabase
        .from("shift_config")
        .update({
          operator: "",
          run_time_minutes: null,
          updated_at: new Date().toISOString(),
        })
        .eq("shift_id", 1);

      setEntries([]);
      localStorage.removeItem("shift_operator");
      localStorage.removeItem("shift_group");
      localStorage.removeItem("shift_run_time");
      localStorage.removeItem("production_log_id"); // next shift starts a fresh production_logs row

      alert("Live log cleared. A new shift will start a fresh history entry.");
    } catch (err: any) {
      alert("Failed to reset shift: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // --- UI Computation Logic ---
  const latestEntry = entries[entries.length - 1] || null;
  const totalDisplayRows = 16;
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

  const DEFAULT_LOAD_TIME_MINUTES = 17;
  const totalDowntime = entries.reduce((total, entry) => {
    const time =
      typeof entry.loadTime === "number"
        ? entry.loadTime
        : parseFloat(entry.loadTime as any) || 0;
    return total + Math.max(0, time - DEFAULT_LOAD_TIME_MINUTES);
  }, 0);

  let faultyMatsProduced = 0;
  entries.forEach((entry) => {
    for (let id = 1; id <= 4; id++) {
      const hasShortMold = !!entry.selectedTableSquares?.[id];
      if (hasShortMold) {
        faultyMatsProduced++;
      }
    }
  });

  const getTableStats = (id: number) => {
    let good = 0;
    let reject = 0;

    entries.forEach((entry) => {
      const hasShortMold = !!entry.selectedTableSquares?.[id];

      if (hasShortMold) {
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

      {/* Error Alert Banner */}
      {fetchError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2 text-sm text-destructive no-print">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Database Fetch Failed: </span>
            {fetchError}. Verify that RLS permissions are correct for the anon
            public role.
          </div>
        </div>
      )}

      {/* Main Document Content Area */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-3 header-compact">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex justify-between items-center md:contents">
              <div>
                <CardTitle className="text-base font-bold tracking-wider uppercase">
                  Press Live Log Table
                </CardTitle>
                <p className="text-[10px] text-primary-foreground/70">
                  Shift Execution & Defect Matrix
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={onBack}
                className="no-print ml-auto md:ml-0 md:order-last gap-1.5 h-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 md:contents">
              <div className="flex items-center gap-2 no-print md:ml-auto">
                <Button
                  onClick={handleResetLog}
                  disabled={!session || isResetting}
                  variant="destructive"
                  className="gap-2 h-9 text-xs font-bold shadow-sm"
                >
                  {isResetting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {!session
                    ? "Login to Reset"
                    : isResetting
                      ? "Archiving..."
                      : "Reset Shift Log"}
                </Button>
                <Button
                  onClick={handlePrintPDF}
                  className="bg-primary-foreground hover:bg-primary-foreground/90 gap-2 h-9 text-xs font-bold shadow-sm text-primary"
                >
                  <Printer className="w-4 h-4" /> Print PDF
                </Button>
              </div>
              <div className="text-[10px] bg-primary-foreground/10 border border-primary-foreground/20 px-2.5 py-0.5 rounded font-mono">
                Date: {latestEntry?.date ? formatDateShort(latestEntry.date) : "---"}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Metadata Strip */}
        <div className="bg-muted border-b border-border p-2.5 space-y-2.5 meta-grid-compact">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-foreground">
            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <User className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Operator / Shift
                </span>
                <span className="font-bold text-foreground text-xs">
                  {shiftConfig?.operator || "Remote Screen"}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize ml-1">
                  ({shiftConfig?.shift_group || "View"})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <Cpu className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Machine Press
                </span>
                <span className="font-extrabold text-accent-ink text-xs">
                  Press #{shiftConfig?.press_number || "1"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Total Downtime(Load:17m)
                </span>
                <span className="font-bold text-destructive text-xs">
                  {totalDowntime > 0 ? `${totalDowntime}m` : "0m"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <Layers className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Accumulated Load Time
                </span>
                <span className="font-bold text-foreground text-xs">
                  {accumulatedLoadTime > 0 ? `${accumulatedLoadTime}m` : "0m"}
                </span>
              </div>
            </div>
          </div>

          {/* Table Line Yield Status Strip */}
          <div className="bg-card p-2 rounded border border-border flex flex-col md:flex-row md:items-center gap-2.5 text-xs meta-item-compact">
            <div className="flex items-center gap-1.5 text-accent-ink shrink-0 md:border-r border-border md:pr-3">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Table Line Output Yields:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
              {[1, 2, 3, 4].map((id) => {
                const stats = getTableStats(id);
                return (
                  <div
                    key={id}
                    className="bg-muted/50 border border-border/70 rounded-md p-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">
                        Table {id}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-accent-ink bg-accent-chip px-1.5 py-0.5 rounded border border-border">
                        {stats.matType}
                      </span>
                    </div>
                    <div className="flex flex-col items-end text-[10px] font-bold gap-0.5 shrink-0">
                      <span className="text-success bg-success/10 px-1.5 py-0.5 rounded font-mono">
                        G: {stats.good}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono ${stats.reject > 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted"}`}
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
            <div className="absolute inset-0 bg-card/80 backdrop-blur-xs flex items-center justify-center z-10 p-12 gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />{" "}
              Fetching raw matrix logs...
            </div>
          )}

          <table className="w-full text-left border-collapse print-compact min-w-[600px]">
            <thead>
              <tr className="bg-muted border-b border-border text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                <th className="p-2 border-r border-border text-center w-[45px]">
                  Cycle
                </th>
                <th className="p-2 border-r border-border text-center w-[140px]">
                  Times (S/E / Load)
                </th>
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Runtime
                </th>
                <th className="p-2 border-r border-border text-center min-w-[220px] px-3">
                  Short Mold Locations
                </th>
                <th className="p-2 min-w-[200px] text-left">
                  Fault Notes / Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[11px]">
              {rows.map((entry, index) => {
                if (!entry) {
                  return (
                    <tr
                      key={`filler-${index}`}
                      className="min-h-[25px] bg-card"
                    >
                      <td className="p-1 border-r border-border text-center text-muted-foreground/50 font-mono font-bold bg-muted/30 w-[45px]">
                        {index + 1}
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 font-mono w-[140px]">
                        —
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 font-mono w-[70px]">
                        —
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 min-w-[220px]">
                        -
                      </td>
                      <td className="p-1 text-muted-foreground/40 italic min-w-[200px]">
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

                return (
                  <tr
                    key={entry.id}
                    className="min-h-[25px] hover:bg-accent text-foreground font-medium"
                  >
                    <td className="p-1 border-r border-border text-center font-mono font-bold bg-muted text-muted-foreground w-[45px]">
                      {index + 1}
                    </td>
                    <td className="p-1 border-r border-border font-mono text-center text-[10px] w-[140px] whitespace-nowrap">
                      <span className="bg-muted px-1 py-0.5 rounded text-foreground font-bold">
                        {entry.startTime}
                      </span>
                      <span className="mx-0.5 text-muted-foreground">→</span>
                      <span className="bg-muted px-1 py-0.5 rounded text-foreground font-bold">
                        {entry.endTime}
                      </span>
                      <span
                        className={`text-[9px] font-sans ml-1 font-semibold ${
                          typeof entry.loadTime === "number" &&
                          entry.loadTime > 17
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        ({entry.loadTime}m)
                      </span>
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono text-[10px] w-[70px]">
                      {entry.runTime !== "" ? `${entry.runTime}m` : "—"}
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono tracking-tight text-muted-foreground text-[10px] min-w-[220px]">
                      {formatShortMolds()}
                    </td>
                    <td
                      className="p-1 text-muted-foreground font-normal text-[10px] min-w-[200px] text-left"
                      title={entry.notes}
                    >
                      {entry.notes || (
                        <span className="text-muted-foreground/50 italic">None</span>
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
        <div className="bg-card border border-border rounded-[var(--radius-card)] p-2.5 flex items-center justify-between shadow-[var(--shadow-card)] print:shadow-none footer-compact">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-accent-chip text-accent-ink">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Total Mats Produced
              </h3>
              <p className="text-[9px] text-muted-foreground font-medium">
                Calculated: {activeEntriesCount} active cycles × 4 tables
              </p>
            </div>
          </div>
          <div className="text-lg font-black font-mono text-accent-ink">
            {totalMatsProduced}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius-card)] p-2.5 flex items-center justify-between shadow-[var(--shadow-card)] print:shadow-none footer-compact">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Faulty Mats Produced
              </h3>
              <p className="text-[9px] text-muted-foreground font-medium">
                Max 1 defect count per table per cycle frame
              </p>
            </div>
          </div>
          <div
            className={`text-lg font-black font-mono ${faultyMatsProduced > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {faultyMatsProduced}
          </div>
        </div>
      </div>
    </div>
  );
}
