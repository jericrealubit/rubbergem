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
  FlaskConical,
  Clock,
  Layers,
  Settings2,
  AlertCircle,
  CheckCircle,
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

interface CheckEntry {
  id: string;
  checkNumber: number;
  date: string;
  time: string;
  crumbRubber: boolean;
  otherRubbers: boolean;
  powderedChemicals: boolean;
  rpo: boolean;
  sulphur: boolean;
  liquidChemicals: boolean;
  rightTankLevel: string;
  leftTankLevel: string;
  notes: string;
}

const TICK_COLUMNS: { key: keyof CheckEntry; label: string }[] = [
  { key: "crumbRubber", label: "Crumb Rubber" },
  { key: "otherRubbers", label: "Other Rubbers" },
  { key: "powderedChemicals", label: "Powdered Chemicals" },
  { key: "rpo", label: "RPO" },
  { key: "sulphur", label: "Sulphur" },
  { key: "liquidChemicals", label: "Liquid Chemicals" },
];

export default function BanburyTablePage({
  onBack,
  session,
}: {
  onBack?: () => void;
  session: any;
}) {
  const [entries, setEntries] = useState<CheckEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [shiftConfig, setShiftConfig] = useState<{
    operator: string;
    shift_group: string;
    product: string;
    bag_weight_kg: number | null;
    batches_made: number | null;
    mesh_bags_count: number | null;
    run_time_minutes: number | null;
  } | null>(null);

  // Current shift setup + live totals, shared via the DB so any viewer (e.g.
  // the boss on a remote screen) sees the live operator/product/totals.
  const fetchShiftConfig = async () => {
    const { data } = await supabase
      .from("banbury_shift_config")
      .select("*")
      .eq("shift_id", 1)
      .maybeSingle();
    if (data) setShiftConfig(data as any);
  };

  const fetchLogs = async () => {
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("banbury_live_log")
        .select("*")
        .order("check_number", { ascending: true });

      if (error) {
        console.error("Error fetching logs:", error);
        setFetchError(error.message);
        return;
      }

      if (data) {
        const transformed: CheckEntry[] = data.map((row: any, index: number) => ({
          id: row.banbury_id.toString(),
          checkNumber: row.check_number ?? index + 1,
          date: row.check_time
            ? new Intl.DateTimeFormat("en-CA", {
                timeZone: "Australia/Perth",
              }).format(new Date(row.check_time))
            : "---",
          time: row.check_time
            ? new Date(row.check_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--",
          crumbRubber: !!row.crumb_rubber,
          otherRubbers: !!row.other_rubbers,
          powderedChemicals: !!row.powdered_chemicals,
          rpo: !!row.rpo,
          sulphur: !!row.sulphur,
          liquidChemicals: !!row.liquid_chemicals,
          rightTankLevel: row.right_tank_level || "",
          leftTankLevel: row.left_tank_level || "",
          notes: row.notes || "",
        }));
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

    const liveLogChannel = supabase
      .channel("banbury-page-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banbury_live_log" },
        () => {
          fetchLogs();
        },
      )
      .subscribe();

    const shiftConfigChannel = supabase
      .channel("banbury-shift-config-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banbury_shift_config" },
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
      const { error } = await supabase.rpc("reset_banbury_shift_log", {
        p_shift_id: "1",
      });

      if (error) throw error;

      const { count, error: verifyError } = await supabase
        .from("banbury_live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);

      if (verifyError) throw verifyError;
      if (count && count > 0) {
        throw new Error(
          "Live log still has rows after reset — check the reset_banbury_shift_log RLS/permissions in Supabase.",
        );
      }

      // Clear the shared shift board so it doesn't show a stale operator.
      // Keep product / bag_weight_kg (persist across shifts, like Press's
      // press_number/mat_types).
      await supabase
        .from("banbury_shift_config")
        .update({
          operator: "",
          batches_made: 0,
          mesh_bags_count: 0,
          run_time_minutes: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("shift_id", 1);

      setEntries([]);
      localStorage.removeItem("banbury_shift_operator");
      localStorage.removeItem("banbury_shift_batches_made");
      localStorage.removeItem("banbury_shift_bags_count");
      localStorage.removeItem("banbury_shift_run_time");
      localStorage.removeItem("banbury_production_log_id");

      alert("Live log cleared. A new shift will start a fresh history entry.");
    } catch (err: any) {
      alert("Failed to reset shift: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const latestEntry = entries[entries.length - 1] || null;
  const totalDisplayRows = 32;
  const rows = Array.from(
    { length: totalDisplayRows },
    (_, i) => entries[i] || null,
  );

  const checksLogged = entries.length;
  const checksWithIssues = entries.filter((e) =>
    TICK_COLUMNS.some((col) => !e[col.key]),
  ).length;

  const bagWeight = shiftConfig?.bag_weight_kg || 0;
  const bagsCount = shiftConfig?.mesh_bags_count || 0;
  const runTimeHours = (shiftConfig?.run_time_minutes || 0) / 60;
  const tonnes = (bagsCount * bagWeight) / 1000;
  const averageOutputPH = runTimeHours > 0 ? tonnes / runTimeHours : 0;

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
            font-size: 9px;
            overflow: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-compact th {
            padding: 3px 3px !important;
            font-size: 8px !important;
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-compact td {
            padding: 2px 3px !important;
            font-size: 8px !important;
            min-height: 18px !important;
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
                  Banbury Check Log
                </CardTitle>
                <p className="text-[10px] text-primary-foreground/70">
                  30 Mesh Production &amp; Chemical Check Log
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
                  className="gap-2 h-9 text-xs font-bold shadow-sm bg-primary-foreground text-destructive hover:bg-primary-foreground/90"
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
              <FlaskConical className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Product
                </span>
                <span className="font-extrabold text-accent-ink text-xs">
                  {shiftConfig?.product || "---"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Run Time
                </span>
                <span className="font-bold text-foreground text-xs">
                  {runTimeHours > 0 ? `${runTimeHours.toFixed(1)}hrs` : "0hrs"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card p-1.5 rounded border border-border meta-item-compact">
              <Layers className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground block leading-none">
                  Checks Logged
                </span>
                <span className="font-bold text-foreground text-xs">
                  {checksLogged}
                </span>
              </div>
            </div>
          </div>

          {/* Shift Totals Strip */}
          <div className="bg-card p-2 rounded border border-border flex flex-col md:flex-row md:items-center gap-2.5 text-xs meta-item-compact">
            <div className="flex items-center gap-1.5 text-accent-ink shrink-0 md:border-r border-border md:pr-3">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Shift Totals:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
              <div className="bg-muted/50 border border-border/70 rounded-md p-1.5 flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">
                  Batches Made
                </span>
                <span className="text-[11px] font-mono font-bold text-foreground">
                  {shiftConfig?.batches_made || 0}
                </span>
              </div>
              <div className="bg-muted/50 border border-border/70 rounded-md p-1.5 flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">
                  # 30 Mesh Bags
                </span>
                <span className="text-[11px] font-mono font-bold text-foreground">
                  {bagsCount}
                </span>
              </div>
              <div className="bg-muted/50 border border-border/70 rounded-md p-1.5 flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">
                  Tonnes
                </span>
                <span className="text-[11px] font-mono font-bold text-foreground">
                  {tonnes.toFixed(2)}
                </span>
              </div>
              <div className="bg-muted/50 border border-border/70 rounded-md p-1.5 flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">
                  Avg Output P/H
                </span>
                <span className="text-[11px] font-mono font-bold text-foreground">
                  {averageOutputPH.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 32-Row Shift Checklist Data Grid */}
        <CardContent className="p-0 overflow-x-auto relative">
          {isLoading && entries.length === 0 && (
            <div className="absolute inset-0 bg-card/80 backdrop-blur-xs flex items-center justify-center z-10 p-12 gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />{" "}
              Fetching raw checklist logs...
            </div>
          )}

          <table className="w-full text-left border-collapse print-compact min-w-[900px]">
            <thead>
              <tr className="bg-muted border-b border-border text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                <th className="p-2 border-r border-border text-center w-[40px]">
                  No.
                </th>
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Time
                </th>
                {TICK_COLUMNS.map((col) => (
                  <th
                    key={col.key as string}
                    className="p-2 border-r border-border text-center w-[70px]"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Right Tank
                </th>
                <th className="p-2 border-r border-border text-center w-[70px]">
                  Left Tank
                </th>
                <th className="p-2 min-w-[180px] text-left">
                  Notes / Issues
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[11px]">
              {rows.map((entry, index) => {
                if (!entry) {
                  return (
                    <tr key={`filler-${index}`} className="min-h-[22px] bg-card">
                      <td className="p-1 border-r border-border text-center text-muted-foreground/50 font-mono font-bold bg-muted/30">
                        {index + 1}
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 font-mono">
                        —
                      </td>
                      {TICK_COLUMNS.map((col) => (
                        <td
                          key={col.key as string}
                          className="p-1 border-r border-border text-center text-muted-foreground/40"
                        >
                          —
                        </td>
                      ))}
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 font-mono">
                        —
                      </td>
                      <td className="p-1 border-r border-border text-center text-muted-foreground/40 font-mono">
                        —
                      </td>
                      <td className="p-1 text-muted-foreground/40 italic">-</td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={entry.id}
                    className="min-h-[22px] hover:bg-accent text-foreground font-medium"
                  >
                    <td className="p-1 border-r border-border text-center font-mono font-bold bg-muted text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono text-[10px] whitespace-nowrap">
                      {entry.time}
                    </td>
                    {TICK_COLUMNS.map((col) => (
                      <td
                        key={col.key as string}
                        className="p-1 border-r border-border text-center"
                      >
                        {entry[col.key] ? (
                          <span className="text-success font-bold">✓</span>
                        ) : (
                          <span className="text-destructive font-bold">✗</span>
                        )}
                      </td>
                    ))}
                    <td className="p-1 border-r border-border text-center font-mono text-[10px]">
                      {entry.rightTankLevel || "—"}
                    </td>
                    <td className="p-1 border-r border-border text-center font-mono text-[10px]">
                      {entry.leftTankLevel || "—"}
                    </td>
                    <td
                      className="p-1 text-muted-foreground font-normal text-[10px] min-w-[180px] text-left"
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
                Checks Logged
              </h3>
              <p className="text-[9px] text-muted-foreground font-medium">
                Chemical / tank checks recorded this shift
              </p>
            </div>
          </div>
          <div className="text-lg font-black font-mono text-accent-ink">
            {checksLogged}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius-card)] p-2.5 flex items-center justify-between shadow-[var(--shadow-card)] print:shadow-none footer-compact">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Checks With Issues
              </h3>
              <p className="text-[9px] text-muted-foreground font-medium">
                At least one material/chemical un-ticked
              </p>
            </div>
          </div>
          <div
            className={`text-lg font-black font-mono ${checksWithIssues > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {checksWithIssues}
          </div>
        </div>
      </div>
    </div>
  );
}
