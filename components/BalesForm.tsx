"use client";

import { supabase } from "@/lib/supabase";
import {
  mergeCycles,
  shiftGroupOf,
  balesTotalsFromCycles,
} from "@/lib/bales-log";
import type { BalesArchivedCycle } from "@/lib/bales-log";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Clock,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings2,
  Loader2,
} from "lucide-react";

/** The bales_production_logs columns read back when resolving a shift's archive row. */
interface BalesShiftLogRowRef {
  id: number;
  operator_shift: string;
  cycles: unknown;
}

interface BagChangeRow {
  id: number;
  side: "east" | "west";
  sequence_number: number;
  weight_kg: number | null;
  logged_at: string;
}

/** Only still needed for the manual "End Shift" fallback (start + typed minutes). */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export default function BalesForm({ session }: { session: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staleClearConfirm, setStaleClearConfirm] = useState<{
    count: number;
  } | null>(null);
  // Whichever finalize action (auto-chain or manual finish) triggered the
  // stale-log check, so "Clear & Continue" can resume the right one.
  const [pendingProceed, setPendingProceed] = useState<
    (() => Promise<void>) | null
  >(null);

  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bales_shift_panel_open");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [operator, setOperator] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bales_shift_operator") || "";
    }
    return "";
  });

  const [shift, setShift] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bales_shift_group") || "day";
    }
    return "day";
  });

  const [meshType, setMeshType] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bales_shift_mesh_type") || "";
    }
    return "";
  });

  const [mainIssuesFaults, setMainIssuesFaults] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bales_shift_main_issues") || "";
    }
    return "";
  });

  // The currently OPEN cycle's start time, or "" if no cycle is running --
  // its presence is the "is a cycle open" flag. Runtime is no longer typed:
  // it's the delta between this value and whenever the next cycle starts.
  const [startTime, setStartTime] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bales_ws_start_time") || "";
    }
    return "";
  });
  const [isManualStart, setIsManualStart] = useState<boolean>(false);

  const [balesProduced, setBalesProduced] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bales_ws_bales_produced");
      return saved !== null && saved !== "" ? Number(saved) : "";
    }
    return "";
  });

  const [baleType, setBaleType] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bales_ws_bale_type") || "";
    }
    return "";
  });

  const [faultyBalesCount, setFaultyBalesCount] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bales_ws_faulty_bales_count");
      return saved !== null && saved !== "" ? Number(saved) : 0;
    }
    return 0;
  });

  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bales_ws_notes") || "";
    }
    return "";
  });

  const [currentDate, setCurrentDate] = useState<string>("");

  // "End Shift" manual runtime fallback, used when there's no next cycle to
  // derive a delta from (the last cycle of a shift).
  const [isFinishShiftOpen, setIsFinishShiftOpen] = useState(false);
  const [manualFinishRunTime, setManualFinishRunTime] = useState<number | "">(
    "",
  );

  // Bag Changes
  const [isBagDialogOpen, setIsBagDialogOpen] = useState(false);
  const [bagSide, setBagSide] = useState<"east" | "west">("east");
  const [bagWeight, setBagWeight] = useState<number | "">("");
  const [isLoggingBag, setIsLoggingBag] = useState(false);
  const [recentBagChanges, setRecentBagChanges] = useState<BagChangeRow[]>([]);

  const cycleOpen = startTime !== "";
  const canFinalize = balesProduced !== "";

  // --- AUTOMATED DISPATCH WATCHERS & POLL SYNCING (bales_* keys only) ---
  useEffect(() => {
    const handleStorageChange = () => {
      const savedState = localStorage.getItem("bales_shift_panel_open");
      setIsShiftOpen(savedState !== null ? savedState === "true" : true);
      setOperator(localStorage.getItem("bales_shift_operator") || "");
      setShift(localStorage.getItem("bales_shift_group") || "day");
      setMeshType(localStorage.getItem("bales_shift_mesh_type") || "");
      setMainIssuesFaults(
        localStorage.getItem("bales_shift_main_issues") || "",
      );

      setStartTime(localStorage.getItem("bales_ws_start_time") || "");
      const bProduced = localStorage.getItem("bales_ws_bales_produced");
      setBalesProduced(
        bProduced !== null ? (bProduced === "" ? "" : Number(bProduced)) : "",
      );
      setBaleType(localStorage.getItem("bales_ws_bale_type") || "");
      const fCount = localStorage.getItem("bales_ws_faulty_bales_count");
      setFaultyBalesCount(
        fCount !== null ? (fCount === "" ? 0 : Number(fCount)) : 0,
      );
      setNotes(localStorage.getItem("bales_ws_notes") || "");
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("bales_shift_panel_open", String(isShiftOpen));
  }, [isShiftOpen]);
  useEffect(() => {
    localStorage.setItem("bales_shift_operator", operator);
  }, [operator]);
  useEffect(() => {
    localStorage.setItem("bales_shift_group", shift);
  }, [shift]);
  useEffect(() => {
    localStorage.setItem("bales_shift_mesh_type", meshType);
  }, [meshType]);
  useEffect(() => {
    localStorage.setItem("bales_shift_main_issues", mainIssuesFaults);
  }, [mainIssuesFaults]);

  // Broadcast the current Bales shift config to the DB so any viewer sees
  // the live shift. Debounced; only logged-in operators write. mesh_type is
  // preserved on reset (see BalesProductionTable's handleResetLog).
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => {
      supabase
        .from("bales_shift_config")
        .upsert(
          {
            shift_id: 1,
            operator,
            shift_group: shift,
            mesh_type: meshType,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "shift_id" },
        )
        .then(({ error }) => {
          if (error) console.error("bales_shift_config upsert failed", error);
        });
    }, 600);
    return () => clearTimeout(t);
  }, [session, operator, shift, meshType]);

  useEffect(() => {
    localStorage.setItem("bales_ws_start_time", startTime);
  }, [startTime]);
  useEffect(() => {
    localStorage.setItem("bales_ws_bales_produced", String(balesProduced));
  }, [balesProduced]);
  useEffect(() => {
    localStorage.setItem("bales_ws_bale_type", baleType);
  }, [baleType]);
  useEffect(() => {
    localStorage.setItem(
      "bales_ws_faulty_bales_count",
      String(faultyBalesCount),
    );
  }, [faultyBalesCount]);
  useEffect(() => {
    localStorage.setItem("bales_ws_notes", notes);
  }, [notes]);

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Perth",
    }).format(new Date());
    setCurrentDate(formatted);
  }, []);

  const fetchRecentBagChanges = async () => {
    const { data } = await supabase
      .from("bales_bag_changes")
      .select("id, side, sequence_number, weight_kg, logged_at")
      .eq("shift_id", 1)
      .order("logged_at", { ascending: false })
      .limit(5);
    if (data) setRecentBagChanges(data as BagChangeRow[]);
  };

  useEffect(() => {
    fetchRecentBagChanges();
  }, []);

  const nowHHMM = () =>
    new Date().toTimeString().split(" ")[0].substring(0, 5);

  const toTimestampIso = (hhmm: string) =>
    new Date(`${currentDate}T${hhmm}:00+08:00`).toISOString();

  const handleStartTap = () => {
    setStartTime(nowHHMM());
  };

  const handleLogBagChange = async () => {
    if (!session) return;
    setIsLoggingBag(true);
    try {
      const { data: existing, error: seqError } = await supabase
        .from("bales_bag_changes")
        .select("sequence_number")
        .eq("shift_id", 1)
        .eq("side", bagSide)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (seqError) throw seqError;

      const nextSeq = (existing?.sequence_number || 0) + 1;

      const { error } = await supabase.from("bales_bag_changes").insert([
        {
          shift_id: 1,
          side: bagSide,
          sequence_number: nextSeq,
          weight_kg: bagWeight === "" ? null : Number(bagWeight),
        },
      ]);
      if (error) throw error;

      toast.success(
        `Logged ${bagSide === "east" ? "East" : "West"} bag #${nextSeq}${
          bagWeight !== "" ? ` (${bagWeight}kg)` : ""
        }`,
      );
      setBagWeight("");
      setIsBagDialogOpen(false);
      fetchRecentBagChanges();
    } catch (err) {
      console.error("Error logging bag change:", err);
      toast.error(
        `Failed to log bag change: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsLoggingBag(false);
    }
  };

  // bales_production_logs holds exactly ONE row per (date, shift group), same
  // resolution strategy as Press's findShiftLogRow (see lib/shift-log.ts's
  // shiftGroupOf) -- the database is the authority, localStorage is only a
  // per-browser fast path.
  const findShiftLogRow = async (): Promise<BalesShiftLogRowRef | null> => {
    const { data: sameDateRows, error: lookupError } = await supabase
      .from("bales_production_logs")
      .select("id, operator_shift, cycles")
      .eq("date", currentDate)
      .order("id", { ascending: true });
    if (lookupError) throw lookupError;

    const group = shiftGroupOf(`${operator} (${shift})`);
    const matches = ((sameDateRows || []) as BalesShiftLogRowRef[]).filter(
      (r) => shiftGroupOf(r.operator_shift) === group,
    );
    const cachedId = localStorage.getItem("bales_production_log_id");
    return matches.find((r) => String(r.id) === cachedId) || matches[0] || null;
  };

  // Finalizes one cycle: start/end/runtime are passed in explicitly since the
  // two call sites (auto-chain finalize, manual "End Shift") compute them
  // differently. `continueWithStartTime`: pass the next cycle's HH:MM to
  // immediately reopen the chain there, or null to close the chain entirely.
  const submitCycle = async (
    startTimestampIso: string,
    endTimestampIso: string,
    runTimeMinutes: number,
    continueWithStartTime: string | null,
  ) => {
    try {
      const { data: latestEntry, error: fetchError } = await supabase
        .from("bales_live_log")
        .select("cycle_number")
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const nextCycleNumber = (latestEntry?.cycle_number || 0) + 1;

      const payload = {
        shift_id: 1,
        cycle_number: nextCycleNumber,
        start_time: startTimestampIso,
        end_time: endTimestampIso,
        run_time_minutes: runTimeMinutes,
        bales_produced: Number(balesProduced) || 0,
        bale_type: baleType,
        faulty_bales_count: Number(faultyBalesCount) || 0,
        mesh_type: meshType,
        notes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("bales_live_log").insert([payload]);
      if (error) throw error;

      const { data: shiftRows } = await supabase
        .from("bales_live_log")
        .select("*")
        .eq("shift_id", 1)
        .order("cycle_number", { ascending: true });

      const shiftLogRows = shiftRows || [];

      const fmtPerth = (iso: string | null) =>
        iso
          ? new Intl.DateTimeFormat("en-GB", {
              timeZone: "Australia/Perth",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(iso))
          : null;

      const aggregatedCycles: BalesArchivedCycle[] = shiftLogRows.map(
        (r: any) => ({
          cycle_number: r.cycle_number,
          start_time: fmtPerth(r.start_time),
          end_time: fmtPerth(r.end_time),
          run_time_minutes: r.run_time_minutes,
          bales_produced: r.bales_produced,
          bale_type: r.bale_type,
          faulty_bales_count: r.faulty_bales_count,
          mesh_type: r.mesh_type,
          notes: r.notes,
        }),
      );

      const operatorShift = `${operator} (${shift})`;

      const buildLogRow = (existingCycles: unknown) => {
        const mergedCycles = mergeCycles(existingCycles, aggregatedCycles);
        const totals = balesTotalsFromCycles(mergedCycles);

        return {
          date: currentDate,
          operator_shift: operatorShift,
          cycles: mergedCycles,
          total_bales_produced: totals.total_bales_produced,
          total_faulty_bales: totals.total_faulty_bales,
          total_run_time_minutes: totals.total_run_time_minutes,
          main_issues_faults: mainIssuesFaults,
        };
      };

      let targetRow: BalesShiftLogRowRef | null = await findShiftLogRow();
      let savedLogId: string | null = targetRow ? String(targetRow.id) : null;

      if (targetRow) {
        const { data: updated, error: updateError } = await supabase
          .from("bales_production_logs")
          .update(buildLogRow(targetRow.cycles))
          .eq("id", targetRow.id)
          .select("id");
        if (updateError) throw updateError;

        if (!updated || updated.length === 0) {
          targetRow = null;
          savedLogId = null;
        }
      }

      if (!targetRow) {
        const { data: inserted, error: insertError } = await supabase
          .from("bales_production_logs")
          .insert([buildLogRow(null)])
          .select("id")
          .single();

        if (insertError) {
          if (insertError.code !== "23505") throw insertError;

          const racedRow = await findShiftLogRow();
          if (!racedRow) throw insertError;

          const { error: retryError } = await supabase
            .from("bales_production_logs")
            .update(buildLogRow(racedRow.cycles))
            .eq("id", racedRow.id);
          if (retryError) throw retryError;

          savedLogId = String(racedRow.id);
        } else if (inserted?.id) {
          savedLogId = String(inserted.id);
        }
      }

      if (savedLogId) {
        localStorage.setItem("bales_production_log_id", savedLogId);
      }

      setBalesProduced("");
      setBaleType("");
      setFaultyBalesCount(0);
      setNotes("");
      localStorage.removeItem("bales_ws_bales_produced");
      localStorage.removeItem("bales_ws_bale_type");
      localStorage.removeItem("bales_ws_faulty_bales_count");
      localStorage.removeItem("bales_ws_notes");

      if (continueWithStartTime) {
        setStartTime(continueWithStartTime);
        setIsManualStart(false);
      } else {
        setStartTime("");
        setIsManualStart(false);
        localStorage.removeItem("bales_ws_start_time");
      }

      setIsSubmitting(false);
      alert(
        continueWithStartTime
          ? "Cycle saved! Next cycle started."
          : "Cycle saved! Shift cycle chain closed.",
      );
    } catch (err) {
      console.error("Error submitting:", err);
      alert(
        `Failed to submit entry: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  // Checks for leftover live_log rows from an already-closed shift before
  // either finalize path proceeds -- mirrors PressForm's stale-clear guard,
  // shared here since two actions (auto-chain finalize, manual finish) can
  // trigger a finalize.
  const runWithStaleCheck = async (proceed: () => Promise<void>) => {
    setIsSubmitting(true);
    try {
      const { count, error: countError } = await supabase
        .from("bales_live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);
      if (countError) throw countError;

      if (count && count > 0) {
        const openShiftRow = await findShiftLogRow();
        if (!openShiftRow) {
          setStaleClearConfirm({ count });
          setPendingProceed(() => proceed);
          setIsSubmitting(false);
          return;
        }
      }

      await proceed();
    } catch (err) {
      console.error("Error checking for leftover shift data:", err);
      toast.error(
        `Could not check for leftover shift data. Action cancelled: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  const handleFinishAndStartNext = async () => {
    if (!session || !cycleOpen || !canFinalize) return;
    const nextHHMM = nowHHMM();
    const startIso = toTimestampIso(startTime);
    const endIso = toTimestampIso(nextHHMM);
    const runTimeMinutes = Math.max(
      0,
      Math.round(
        (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
      ),
    );
    await runWithStaleCheck(() =>
      submitCycle(startIso, endIso, runTimeMinutes, nextHHMM),
    );
  };

  const handleFinishShiftManual = async () => {
    if (!session || !cycleOpen || manualFinishRunTime === "" || !canFinalize)
      return;
    const startIso = toTimestampIso(startTime);
    const endHHMM = addMinutesToTime(startTime, Number(manualFinishRunTime));
    const endIso = toTimestampIso(endHHMM);
    setIsFinishShiftOpen(false);
    await runWithStaleCheck(() =>
      submitCycle(startIso, endIso, Number(manualFinishRunTime), null),
    );
    setManualFinishRunTime("");
  };

  const handleCancelClearStale = () => {
    setStaleClearConfirm(null);
    setPendingProceed(null);
    setIsSubmitting(false);
    toast.info("Action cancelled — leftover live log data was not cleared.");
  };

  const handleConfirmClearStale = async () => {
    if (!staleClearConfirm) return;
    const clearedCount = staleClearConfirm.count;
    setIsSubmitting(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "reset_bales_shift_log",
        { p_shift_id: "1" },
      );
      if (rpcError) throw rpcError;

      const { count: verifyCount, error: verifyError } = await supabase
        .from("bales_live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);
      if (verifyError) throw verifyError;
      if (verifyCount && verifyCount > 0) {
        throw new Error(
          "Live log still has rows after clearing — check reset_bales_shift_log RLS/permissions in Supabase.",
        );
      }

      setStaleClearConfirm(null);
      toast.warning(
        `Cleared ${clearedCount} leftover cycle${clearedCount === 1 ? "" : "s"} from a previous shift.`,
      );

      const proceed = pendingProceed;
      setPendingProceed(null);
      if (proceed) {
        await proceed();
      } else {
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Error clearing leftover live log data:", err);
      toast.error(
        `Failed to clear leftover live log data. Action cancelled: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md ipad:max-w-5xl mx-auto p-3 ipad:p-4 space-y-4 pb-12">
      <div className="relative bg-emerald-800 text-white p-4 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold tracking-wider uppercase whitespace-nowrap">
          Bales Production
        </h1>
      </div>

      <div className="space-y-4 ipad:space-y-0 ipad:grid ipad:grid-cols-2 ipad:gap-4 ipad:items-start">
        <div className="space-y-4">
          {/* Collapsible Shift Information Card */}
          <Card className="shadow-sm border-neutral-200/60 overflow-hidden transition-all duration-200">
            <button
              type="button"
              onClick={() => setIsShiftOpen(!isShiftOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-50/50 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-2.5">
                <Settings2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-sm font-semibold uppercase text-emerald-900 tracking-wide block">
                    Shift Information
                  </span>
                  {!isShiftOpen && (
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                      {operator || "No Name"} •{" "}
                      {shift === "day" ? "Day" : "Night"} • Mesh:{" "}
                      {meshType || "---"} • {currentDate || "---"}
                    </p>
                  )}
                </div>
              </div>
              {isShiftOpen ? (
                <ChevronUp className="w-5 h-5 text-neutral-400 shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0" />
              )}
            </button>

            {isShiftOpen && (
              <CardContent className="p-4 pt-2 border-t border-neutral-100/60 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bales-date">Shift Date</Label>
                    <Input
                      id="bales-date"
                      type="date"
                      value={currentDate}
                      readOnly
                      className="bg-neutral-50 cursor-not-allowed text-neutral-500 select-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bales-operator">Operator Name</Label>
                    <Input
                      id="bales-operator"
                      placeholder="First Name"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bales-shift">Shift Group</Label>
                    <Select value={shift} onValueChange={setShift}>
                      <SelectTrigger id="bales-shift">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bales-mesh">Mesh Type</Label>
                    <Input
                      id="bales-mesh"
                      placeholder="e.g. 30"
                      value={meshType}
                      onChange={(e) => setMeshType(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Cycle Entry Card */}
          <Card className="shadow-sm border-neutral-200/60">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" /> Cycle Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{cycleOpen ? "Cycle Started At" : "Start Time"}</Label>
                  <button
                    type="button"
                    onClick={() => setIsManualStart(!isManualStart)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors uppercase tracking-wider"
                  >
                    {isManualStart ? "● Tap Mode" : "✎ Manual"}
                  </button>
                </div>
                {isManualStart ? (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-12 text-center font-mono font-bold text-sm bg-emerald-50/10 border-emerald-200 focus-visible:ring-emerald-600"
                  />
                ) : cycleOpen ? (
                  <div className="h-12 flex items-center justify-center rounded-md border-2 border-dashed border-emerald-600 bg-emerald-50/50 text-emerald-800 font-bold tracking-wide font-mono">
                    {startTime}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 font-bold tracking-wide border-dashed border-2 border-emerald-600 bg-emerald-50/50 text-emerald-800"
                    onClick={handleStartTap}
                  >
                    TAP TO START
                  </Button>
                )}
              </div>

              {cycleOpen && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    disabled={!session || isSubmitting || !canFinalize}
                    onClick={handleFinishAndStartNext}
                    className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed font-bold tracking-wide uppercase text-sm shadow-md transition-colors"
                  >
                    {isSubmitting && (
                      <Loader2 className="animate-spin" size={20} />
                    )}
                    {!session
                      ? "Login to finish cycle"
                      : !canFinalize
                        ? "Enter Bales Produced to Finish"
                        : "Finish Cycle & Start Next"}
                  </Button>
                  <button
                    type="button"
                    disabled={!session || isSubmitting}
                    onClick={() => setIsFinishShiftOpen(true)}
                    className="w-full text-center text-[11px] font-bold text-neutral-500 hover:text-emerald-700 uppercase tracking-wider transition-colors disabled:opacity-40"
                  >
                    End Shift — Enter Runtime Manually
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bales-produced">Bales Produced</Label>
                  <Input
                    type="number"
                    id="bales-produced"
                    placeholder="e.g. 24"
                    disabled={!cycleOpen}
                    value={balesProduced}
                    onChange={(e) =>
                      setBalesProduced(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bales-type">Bale Type</Label>
                  <Input
                    id="bales-type"
                    placeholder="e.g. B"
                    disabled={!cycleOpen}
                    value={baleType}
                    onChange={(e) => setBaleType(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bales-faulty">Faulty Bales Count</Label>
                <Input
                  type="number"
                  id="bales-faulty"
                  placeholder="0"
                  disabled={!cycleOpen}
                  value={faultyBalesCount}
                  onChange={(e) =>
                    setFaultyBalesCount(
                      e.target.value ? Number(e.target.value) : 0,
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bales-notes">
                  General Notes / Faults Occurred
                </Label>
                <Textarea
                  id="bales-notes"
                  disabled={!cycleOpen}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Bag #1, Palletyzer needed fixing..."
                  className="resize-none min-h-[60px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Bag Changes Card */}
          <Card className="shadow-sm border-neutral-200/60">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-700" /> Bag Changes
              </CardTitle>
              <Button
                type="button"
                size="sm"
                disabled={!session}
                onClick={() => setIsBagDialogOpen(true)}
                className="h-8 px-3 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800"
              >
                Log Bag Change
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {recentBagChanges.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">
                  No bag changes logged yet this shift.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentBagChanges.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5"
                    >
                      <span className="font-bold uppercase text-neutral-700">
                        {b.side === "east" ? "East" : "West"} #
                        {b.sequence_number}
                      </span>
                      <span className="font-mono text-neutral-600">
                        {b.weight_kg != null ? `${b.weight_kg}kg` : "—"}
                      </span>
                      <span className="text-neutral-400">
                        {new Intl.DateTimeFormat("en-GB", {
                          timeZone: "Australia/Perth",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }).format(new Date(b.logged_at))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Issues / Faults Card */}
          <Card className="shadow-sm border-neutral-200/60">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-emerald-700" /> Main
                Issues / Faults
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1.5">
              <Label htmlFor="bales-main-issues">
                Shift-level summary (persists across cycle entries)
              </Label>
              <Textarea
                id="bales-main-issues"
                value={mainIssuesFaults}
                onChange={(e) => setMainIssuesFaults(e.target.value)}
                placeholder="e.g., Palletyzer needed fixing mid-shift..."
                className="resize-none min-h-[90px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Bag Change Dialog */}
      <Dialog open={isBagDialogOpen} onOpenChange={setIsBagDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Package className="w-5 h-5 shrink-0" />
              Log Bag Change
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Side</Label>
              <RadioGroup
                value={bagSide}
                onValueChange={(v) => setBagSide(v as "east" | "west")}
                className="grid grid-cols-2 gap-2"
              >
                {(["east", "west"] as const).map((side) => (
                  <div key={side} className="flex items-center w-full">
                    <RadioGroupItem
                      value={side}
                      id={`bag-side-${side}`}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`bag-side-${side}`}
                      className={`h-10 w-full border rounded flex items-center justify-center text-sm font-bold uppercase cursor-pointer transition-all ${
                        bagSide === side
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {side}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bag-weight">Weight (kg)</Label>
              <Input
                type="number"
                id="bag-weight"
                placeholder="e.g. 683"
                value={bagWeight}
                onChange={(e) =>
                  setBagWeight(e.target.value ? Number(e.target.value) : "")
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBagDialogOpen(false)}
              disabled={isLoggingBag}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogBagChange}
              disabled={isLoggingBag}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {isLoggingBag && <Loader2 className="animate-spin" size={16} />}
              Log Bag Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Shift — manual runtime fallback */}
      <Dialog open={isFinishShiftOpen} onOpenChange={setIsFinishShiftOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Clock className="w-5 h-5 shrink-0" />
              End Shift — Manual Runtime
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-neutral-500">
              Closes out the current cycle (started at{" "}
              <strong>{startTime}</strong>) without opening a new one. Use
              this for the last cycle of the shift, where there's no next
              start to measure from.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="manual-runtime">Run Time (min)</Label>
              <Input
                type="number"
                id="manual-runtime"
                placeholder="Minutes"
                value={manualFinishRunTime}
                onChange={(e) =>
                  setManualFinishRunTime(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFinishShiftOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinishShiftManual}
              disabled={
                manualFinishRunTime === "" || !canFinalize || isSubmitting
              }
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              End Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stale live log confirmation */}
      <Dialog
        open={!!staleClearConfirm}
        onOpenChange={(open) => {
          if (!open) handleCancelClearStale();
        }}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Leftover Shift Data Found
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            This looks like the start of a new shift, but the live log still
            has <strong>{staleClearConfirm?.count}</strong> cycle
            {staleClearConfirm?.count === 1 ? "" : "s"} left over from a
            previous shift. Clear it before continuing?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelClearStale}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmClearStale}>
              Clear &amp; Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
