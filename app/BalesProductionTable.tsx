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
  Clock,
  Layers,
  Settings2,
  AlertCircle,
  CheckCircle,
  Package,
  Hash,
  Loader2,
} from "lucide-react";

interface BalesCycleEntry {
  id: string;
  cycleNumber: number;
  startTime: string;
  endTime: string;
  runTime: number | "";
  balesProduced: number;
  baleType: string;
  faultyBalesCount: number;
  meshType: string;
  notes: string;
}

interface BagChangeRow {
  id: number;
  side: "east" | "west";
  sequence_number: number;
  weight_kg: number | null;
  logged_at: string;
}

export default function BalesProductionTable({
  onBack,
  session,
}: {
  onBack?: () => void;
  session: any;
}) {
  const [entries, setEntries] = useState<BalesCycleEntry[]>([]);
  const [bagChanges, setBagChanges] = useState<BagChangeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [shiftConfig, setShiftConfig] = useState<{
    operator: string;
    shift_group: string;
    mesh_type: string;
  } | null>(null);

  const fetchShiftConfig = async () => {
    const { data } = await supabase
      .from("bales_shift_config")
      .select("*")
      .eq("shift_id", 1)
      .maybeSingle();
    if (data) setShiftConfig(data as any);
  };

  const fetchBagChanges = async () => {
    const { data } = await supabase
      .from("bales_bag_changes")
      .select("*")
      .eq("shift_id", 1)
      .order("logged_at", { ascending: false });
    if (data) setBagChanges(data as BagChangeRow[]);
  };

  const fetchLogs = async () => {
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("bales_live_log")
        .select("*")
        .eq("shift_id", 1)
        .order("cycle_number", { ascending: true });

      if (error) {
        console.error("Error fetching bales logs:", error);
        setFetchError(error.message);
        return;
      }

      if (data) {
        const transformed: BalesCycleEntry[] = data.map(
          (row: any, index: number) => ({
            id: row.bales_id.toString(),
            cycleNumber: row.cycle_number ?? index + 1,
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
            balesProduced: row.bales_produced ?? 0,
            baleType: row.bale_type || "",
            faultyBalesCount: row.faulty_bales_count ?? 0,
            meshType: row.mesh_type || "",
            notes: row.notes || "",
          }),
        );
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
    fetchLogs();
    fetchShiftConfig();
    fetchBagChanges();

    const liveLogChannel = supabase
      .channel("bales-page-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bales_live_log" },
        () => fetchLogs(),
      )
      .subscribe();

    const shiftConfigChannel = supabase
      .channel("bales-shift-config-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bales_shift_config" },
        () => fetchShiftConfig(),
      )
      .subscribe();

    const bagChangesChannel = supabase
      .channel("bales-bag-changes-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bales_bag_changes" },
        () => fetchBagChanges(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(liveLogChannel);
      supabase.removeChannel(shiftConfigChannel);
      supabase.removeChannel(bagChangesChannel);
    };
  }, []);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleResetLog = async () => {
    const isConfirmed = window.confirm(
      "This will clear the Bales live log. The shift is already saved to history — a new shift will start a fresh history entry. Continue?",
    );
    if (!isConfirmed) return;

    setIsResetting(true);
    try {
      const { error } = await supabase.rpc("reset_bales_shift_log", {
        p_shift_id: "1",
      });
      if (error) throw error;

      const { count, error: verifyError } = await supabase
        .from("bales_live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);
      if (verifyError) throw verifyError;
      if (count && count > 0) {
        throw new Error(
          "Live log still has rows after reset — check the reset_bales_shift_log RLS/permissions in Supabase.",
        );
      }

      // Keep mesh_type (persists across shifts, like Press's press_number/mat_types).
      await supabase
        .from("bales_shift_config")
        .update({
          operator: "",
          updated_at: new Date().toISOString(),
        })
        .eq("shift_id", 1);

      setEntries([]);
      setBagChanges([]);
      localStorage.removeItem("bales_shift_operator");
      localStorage.removeItem("bales_shift_group");
      localStorage.removeItem("bales_production_log_id");

      alert(
        "Bales live log cleared. A new shift will start a fresh history entry.",
      );
    } catch (err: any) {
      alert("Failed to reset Bales shift: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // --- UI Computation Logic ---
  const totalDisplayRows = 22;
  const rows = Array.from(
    { length: totalDisplayRows },
    (_, i) => entries[i] || null,
  );

  const totalBalesProduced = entries.reduce(
    (sum, e) => sum + (e.balesProduced || 0),
    0,
  );
  const totalFaultyBales = entries.reduce(
    (sum, e) => sum + (e.faultyBalesCount || 0),
    0,
  );
  const totalRunTime = entries.reduce(
    (sum, e) => sum + (typeof e.runTime === "number" ? e.runTime : 0),
    0,
  );

  const latestMeshType = [...entries].reverse().find((e) => e.meshType)
    ?.meshType;

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
      <div className="flex items-center justify-between no-print bg-card p-2 rounded-xl border border-border">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 h-9 text-muted-foreground text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
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
            className="bg-primary hover:bg-primary/90 gap-2 h-9 text-xs font-bold shadow-sm text-primary-foreground"
          >
            <Printer className="w-4 h-4" /> Print PDF
          </Button>
        </div>
      </div>

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

      <Card className="overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-3 header-compact">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold tracking-wider uppercase">
                Bales Live Log Table
              </CardTitle>
              <p className="text-[10px] text-primary-foreground/70">
                Baling Line Execution Log
              </p>
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
              <Settings2 className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Mesh Type
                </span>
                <span className="font-extrabold text-accent-ink text-xs">
                  {shiftConfig?.mesh_type || latestMeshType || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <Hash className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Cycles Logged
                </span>
                <span className="font-bold text-foreground text-xs">
                  {entries.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <Layers className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Total Run Time
                </span>
                <span className="font-bold text-foreground text-xs">
                  {totalRunTime > 0 ? `${totalRunTime}m` : "0m"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 22-Row Shift Cycle Data Grid */}
        <CardContent className="p-0 overflow-x-auto relative">
          {isLoading && entries.length === 0 && (
            <div className="absolute inset-0 bg-card/80 backdrop-blur-xs flex items-center justify-center z-10 p-12 gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />{" "}
              Fetching raw logs...
            </div>
          )}

          <table className="w-full text-left border-collapse print-compact min-w-[760px]">
            <thead>
              <tr className="bg-muted border-b border-border text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                <th className="p-2 border-r border-border text-center w-[45px]">
                  Cycle
                </th>
                <th className="p-2 border-r border-border text-center w-[130px]">
                  Times
                </th>
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Runtime
                </th>
                <th className="p-2 border-r border-border text-center w-[90px]">
                  Bales Produced
                </th>
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Bale Type
                </th>
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Faulty
                </th>
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Mesh
                </th>
                <th className="p-2 min-w-[200px] text-left">
                  Notes / Faults
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
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 font-mono w-[130px]">
                        —
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 font-mono w-[70px]">
                        —
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 w-[90px]">
                        -
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 w-[70px]">
                        -
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 w-[70px]">
                        -
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 w-[70px]">
                        -
                      </td>
                      <td className="p-1 text-muted-foreground/40 italic min-w-[200px]">
                        -
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={entry.id}
                    className="min-h-[25px] hover:bg-accent text-foreground font-medium"
                  >
                    <td className="p-1 border-r border-border text-center font-mono font-bold bg-muted text-muted-foreground w-[45px]">
                      {index + 1}
                    </td>
                    <td className="p-1 border-r border-border font-mono text-center text-[10px] w-[130px] whitespace-nowrap">
                      <span className="bg-muted px-1 py-0.5 rounded text-foreground font-bold">
                        {entry.startTime}
                      </span>
                      <span className="mx-0.5 text-muted-foreground">→</span>
                      <span className="bg-muted px-1 py-0.5 rounded text-foreground font-bold">
                        {entry.endTime}
                      </span>
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono text-[10px] w-[70px]">
                      {entry.runTime !== "" ? `${entry.runTime}m` : "—"}
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono text-[10px] w-[90px]">
                      {entry.balesProduced}
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono text-[10px] w-[70px]">
                      {entry.baleType || "—"}
                    </td>
                    <td
                      className={`p-1 border-r border-border text-center font-mono text-[10px] w-[70px] ${
                        entry.faultyBalesCount > 0
                          ? "text-destructive font-bold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {entry.faultyBalesCount}
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono text-[10px] w-[70px]">
                      {entry.meshType || "—"}
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

      {/* Bag Changes Panel */}
      <Card className="overflow-hidden">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-accent-ink flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Bag Changes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bagChanges.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-3">
              No bag changes logged this shift.
            </p>
          ) : (
            <table className="w-full text-left border-collapse print-compact">
              <thead>
                <tr className="bg-muted border-b border-border text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                  <th className="p-2 border-r border-border text-center">
                    Side
                  </th>
                  <th className="p-2 border-r border-border text-center">
                    Sequence #
                  </th>
                  <th className="p-2 border-r border-border text-center">
                    Weight (kg)
                  </th>
                  <th className="p-2 text-center">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[11px]">
                {bagChanges.map((b) => (
                  <tr key={b.id} className="hover:bg-accent">
                    <td className="p-1.5 border-r border-border text-center font-bold uppercase text-foreground">
                      {b.side}
                    </td>
                    <td className="p-1.5 border-r border-border text-center font-mono">
                      #{b.sequence_number}
                    </td>
                    <td className="p-1.5 border-r border-border text-center font-mono">
                      {b.weight_kg != null ? b.weight_kg : "—"}
                    </td>
                    <td className="p-1.5 text-center font-mono text-muted-foreground">
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Australia/Perth",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(new Date(b.logged_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                Total Bales Produced
              </h3>
              <p className="text-[9px] text-muted-foreground font-medium">
                Summed across {entries.length} logged cycle
                {entries.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="text-lg font-black font-mono text-accent-ink">
            {totalBalesProduced}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius-card)] p-2.5 flex items-center justify-between shadow-[var(--shadow-card)] print:shadow-none footer-compact">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Total Faulty Bales
              </h3>
              <p className="text-[9px] text-muted-foreground font-medium">
                Summed from per-cycle faulty count
              </p>
            </div>
          </div>
          <div
            className={`text-lg font-black font-mono ${totalFaultyBales > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {totalFaultyBales}
          </div>
        </div>
      </div>
    </div>
  );
}
