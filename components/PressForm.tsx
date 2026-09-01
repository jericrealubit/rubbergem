"use client";

import { supabase } from "@/lib/supabase";
import {
  mergeCycles,
  shiftGroupOf,
  tableYieldsFromCycles,
} from "@/lib/shift-log";
import type { ArchivedCycle } from "@/lib/shift-log";
import { useEffect, useRef, useState } from "react";
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
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings2,
  RotateCcw,
  Loader2,
  FileText,
} from "lucide-react";

/** The production_logs columns read back when resolving a shift's archive row. */
interface ShiftLogRowRef {
  id: number;
  operator_shift: string;
  cycles: unknown;
}

export default function ProductionForm({
  session,
  onStartTimer,
  onNavigateToTable,
}: {
  session: any;
  onStartTimer?: (minutes: number) => void;
  onNavigateToTable?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- HOLD-TO-CONFIRM SUBMIT ---
  const [holdProgress, setHoldProgress] = useState(0); // 0-100
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const HOLD_DURATION_MS = 700;

  const [staleClearConfirm, setStaleClearConfirm] = useState<{
    count: number;
  } | null>(null);
  const [pendingProceed, setPendingProceed] = useState<
    (() => Promise<void>) | null
  >(null);
  const [endShiftConfirmOpen, setEndShiftConfirmOpen] = useState(false);

  // --- LAYOUT & CONFIGURATION PERSISTENCE ---
  const [pressNumber, setPressNumber] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("terminal_press_number") || "1";
    }
    return "1";
  });

  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("shift_panel_open");
      return savedState !== null ? savedState === "true" : false;
    }
    return false;
  });

  // --- SHIFT INFORMATION DATA PERSISTENCE ---
  const [operator, setOperator] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("shift_operator") || "";
    }
    return "";
  });

  const [shift, setShift] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("shift_group") || "day";
    }
    return "day";
  });

  const [runTime, setRunTime] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shift_run_time");
      return saved !== null && saved !== "" ? Number(saved) : "";
    }
    return "";
  });

  const [tableMatTypes, setTableMatTypes] = useState<Record<number, string>>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("shift_mat_types");
        return saved ? JSON.parse(saved) : {};
      }
      return {};
    },
  );

  // --- ACTIVE WORKSPACE VALUES PERSISTENCE ---
  const [startTime, setStartTime] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ws_start_time") || "";
    }
    return "";
  });

  // Manual input switch for lunch/break start-time overrides
  const [isManualStart, setIsManualStart] = useState<boolean>(false);

  const [selectedTableSquares, setSelectedTableSquares] = useState<
    Record<number, string>
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ws_selected_squares");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ws_notes") || "";
    }
    return "";
  });

  const [currentDate, setCurrentDate] = useState<string>("");

  // --- AUTOMATED DISPATCH WATCHERS & POLL SYNCING ---
  useEffect(() => {
    const handleStorageChange = () => {
      setPressNumber(localStorage.getItem("terminal_press_number") || "1");
      const savedState = localStorage.getItem("shift_panel_open");
      setIsShiftOpen(savedState !== null ? savedState === "true" : false);
      setOperator(localStorage.getItem("shift_operator") || "");
      setShift(localStorage.getItem("shift_group") || "day");

      const rTime = localStorage.getItem("shift_run_time");
      setRunTime(rTime !== null ? (rTime === "" ? "" : Number(rTime)) : "");

      const savedMats = localStorage.getItem("shift_mat_types");
      setTableMatTypes(savedMats ? JSON.parse(savedMats) : {});

      // Synchronize active workspace components
      setStartTime(localStorage.getItem("ws_start_time") || "");
      const savedSquares = localStorage.getItem("ws_selected_squares");
      setSelectedTableSquares(savedSquares ? JSON.parse(savedSquares) : {});
      setNotes(localStorage.getItem("ws_notes") || "");
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Sync state modifications to localStorage instantly
  useEffect(() => {
    localStorage.setItem("terminal_press_number", pressNumber);
  }, [pressNumber]);
  useEffect(() => {
    localStorage.setItem("shift_panel_open", String(isShiftOpen));
  }, [isShiftOpen]);
  useEffect(() => {
    localStorage.setItem("shift_operator", operator);
  }, [operator]);
  useEffect(() => {
    localStorage.setItem("shift_group", shift);
  }, [shift]);
  useEffect(() => {
    localStorage.setItem("shift_run_time", String(runTime));
  }, [runTime]);
  useEffect(() => {
    localStorage.setItem("shift_mat_types", JSON.stringify(tableMatTypes));
  }, [tableMatTypes]);

  // Broadcast the current shift config to the DB so other terminals / the boss's
  // ProductionTable see the live shift. Debounced; only logged-in operators write.
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => {
      supabase
        .from("shift_config")
        .upsert(
          {
            shift_id: 1,
            operator,
            shift_group: shift,
            press_number: pressNumber,
            run_time_minutes: runTime === "" ? null : Number(runTime),
            mat_types: tableMatTypes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "shift_id" },
        )
        .then(({ error }) => {
          if (error) console.error("shift_config upsert failed", error);
        });
    }, 600);
    return () => clearTimeout(t);
  }, [session, operator, shift, pressNumber, runTime, tableMatTypes]);

  useEffect(() => {
    localStorage.setItem("ws_start_time", startTime);
  }, [startTime]);
  useEffect(() => {
    localStorage.setItem(
      "ws_selected_squares",
      JSON.stringify(selectedTableSquares),
    );
  }, [selectedTableSquares]);
  useEffect(() => {
    localStorage.setItem("ws_notes", notes);
  }, [notes]);

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Perth",
    }).format(new Date());

    setCurrentDate(formatted);
  }, []);

  const nowHHMM = () =>
    new Date().toTimeString().split(" ")[0].substring(0, 5);

  const handleStartTap = () => {
    setStartTime(nowHHMM());
  };

  // Load/unload duration = elapsed(start, end) minus the shift's configured
  // press Run Time, clamped at 0 (midnight-crossover handled the same way the
  // old live calculator did).
  const computeDurationMinutes = (endTimeHHMM: string) => {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTimeHHMM.split(":").map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;

    if (endTotalMinutes < startTotalMinutes) endTotalMinutes += 24 * 60;
    return Math.max(
      0,
      endTotalMinutes - startTotalMinutes - (Number(runTime) || 0),
    );
  };

  // Live 1-second ticker driving the Load Time readout while a cycle is open.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Same computation as computeDurationMinutes, but seconds-precision and
  // unclamped -- reads negative while still inside the press's own Run Time,
  // crossing to positive once the operator's actual load/unload work begins.
  const liveDurationSeconds = (() => {
    if (!startTime) return null;
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const startTotalSeconds = (startHours * 60 + startMinutes) * 60;
    const now = new Date(nowTick);
    let nowTotalSeconds =
      now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    if (nowTotalSeconds < startTotalSeconds) nowTotalSeconds += 24 * 3600;
    return nowTotalSeconds - startTotalSeconds - (Number(runTime) || 0) * 60;
  })();

  const formatSigned = (totalSeconds: number) => {
    const sign = totalSeconds < 0 ? "-" : "";
    const abs = Math.abs(totalSeconds);
    const mm = String(Math.floor(abs / 60)).padStart(2, "0");
    const ss = String(Math.floor(abs % 60)).padStart(2, "0");
    return `${sign}${mm}:${ss}`;
  };

  const handleSquareSelect = (tableId: number, positionId: string) => {
    setSelectedTableSquares((prev) => ({ ...prev, [tableId]: positionId }));
  };

  const handleMatSetupSelect = (tableId: number, matType: string) => {
    setTableMatTypes((prev) => ({ ...prev, [tableId]: matType }));
  };

  const handleResetShortMolding = () => {
    setSelectedTableSquares({});
  };

  const handleResetStartTime = () => {
    setStartTime("");
    setIsManualStart(false);
  };

  // production_logs holds exactly ONE row per (date, shift group).
  // localStorage["production_log_id"] is only a per-browser fast path, so on
  // its own a second terminal, a cleared browser store or a mid-shift reset
  // would each insert a duplicate row for the same shift. The database is the
  // authority: find this shift's row by date + shift group, and only insert
  // when there genuinely isn't one.
  const findShiftLogRow = async (): Promise<ShiftLogRowRef | null> => {
    const { data: sameDateRows, error: lookupError } = await supabase
      .from("production_logs")
      .select("id, operator_shift, cycles")
      .eq("date", currentDate)
      .order("id", { ascending: true });
    if (lookupError) throw lookupError;

    // Derive the group from the string we would write, not from `shift`
    // directly, so this always matches the row it created — an operator whose
    // name happens to contain "night" would otherwise never match their own
    // row and duplicate it on every submit.
    const group = shiftGroupOf(`${operator} (${shift})`);
    const matches = ((sameDateRows || []) as ShiftLogRowRef[]).filter(
      (r) => shiftGroupOf(r.operator_shift) === group,
    );
    const cachedId = localStorage.getItem("production_log_id");
    return matches.find((r) => String(r.id) === cachedId) || matches[0] || null;
  };

  // Shared by the stale-clear dialog and End Shift's own post-archive clear.
  // Throws on failure — callers decide how to surface that.
  const clearLiveLog = async () => {
    const { error: rpcError } = await supabase.rpc("reset_shift_log", {
      p_shift_id: "1",
    });
    if (rpcError) throw rpcError;

    // Verify the delete actually happened. Postgres doesn't error on a
    // DELETE that matches 0 rows (e.g. if RLS silently filters it), so
    // without this check a permissions regression would look like success.
    const { count: verifyCount, error: verifyError } = await supabase
      .from("live_log")
      .select("*", { count: "exact", head: true })
      .eq("shift_id", 1);
    if (verifyError) throw verifyError;
    if (verifyCount && verifyCount > 0) {
      throw new Error(
        "Live log still has rows after clearing — check reset_shift_log RLS/permissions in Supabase.",
      );
    }
  };

  const submitCycle = async (
    endTimeHHMM: string,
    durationMinutes: number,
    continueChain: boolean,
  ) => {
    try {
      const { data: latestEntry, error: fetchError } = await supabase
        .from("live_log")
        .select("cycle_number")
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const nextCycleNumber = (latestEntry?.cycle_number || 0) + 1;

      const startTimestamp = new Date(
        `${currentDate}T${startTime}:00+08:00`,
      ).toISOString();

      const endTimestamp = new Date(
        `${currentDate}T${endTimeHHMM}:00+08:00`,
      ).toISOString();

      const formattedYieldJson: Record<string, any> = {};

      [1, 2, 3, 4].forEach((tableId) => {
        const matType = tableMatTypes[tableId] || "Unknown";
        const shortMoldPos = selectedTableSquares[tableId];

        const isReject = !!shortMoldPos;

        formattedYieldJson[`table_${tableId}`] = {
          good: isReject ? 0 : 1,
          reject: isReject ? 1 : 0,
          type: matType,
          position: shortMoldPos || null,
        };
      });

      const payload = {
        shift_id: 1,
        cycle_number: nextCycleNumber,
        start_time: startTimestamp,
        end_time: endTimestamp,
        load_duration_seconds: durationMinutes * 60,
        run_time_minutes: Number(runTime) || null,
        short_mold_json: formattedYieldJson,
        notes: notes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("live_log").insert([payload]);
      if (error) throw error;

      // Mirror the whole shift into production_logs so History reflects it live.
      // Re-aggregate from live_log (good/reject already baked into short_mold_json).
      const { data: shiftRows } = await supabase
        .from("live_log")
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

      const aggregatedCycles: ArchivedCycle[] = shiftLogRows.map((r: any) => ({
        cycle_number: r.cycle_number,
        start_time: fmtPerth(r.start_time),
        end_time: fmtPerth(r.end_time),
        run_duration_seconds:
          r.start_time && r.end_time
            ? Math.floor(
                (new Date(r.end_time).getTime() -
                  new Date(r.start_time).getTime()) /
                  1000,
              )
            : null,
        load_duration_seconds: r.load_duration_seconds,
        run_time_minutes: r.run_time_minutes,
        short_mold_json: r.short_mold_json,
        bubble_json: r.bubble_json,
        notes: r.notes,
      }));

      const operatorShift = `${operator} (${shift})`;

      // Union the row's stored cycles with the live_log re-aggregation rather
      // than overwriting: after a "Reset Shift Log" the live_log no longer
      // holds the earlier cycles, and they must survive in history.
      const buildLogRow = (existingCycles: unknown) => {
        const mergedCycles = mergeCycles(existingCycles, aggregatedCycles);
        const tableYields = tableYieldsFromCycles(mergedCycles);

        return {
          date: currentDate, // Perth YYYY-MM-DD computed on mount
          machine_press: `Press #${pressNumber}`,
          operator_shift: operatorShift,
          table_line_output_yields: tableYields,
          cycles: mergedCycles,
          total_mats_produced: Object.values(tableYields).reduce(
            (s, t) => s + t.good,
            0,
          ),
          faulty_mats_produced: Object.values(tableYields).reduce(
            (s, t) => s + t.reject,
            0,
          ),
        };
      };

      let targetRow: ShiftLogRowRef | null = await findShiftLogRow();
      let savedLogId: string | null = targetRow ? String(targetRow.id) : null;

      if (targetRow) {
        const { data: updated, error: updateError } = await supabase
          .from("production_logs")
          .update(buildLogRow(targetRow.cycles))
          .eq("id", targetRow.id)
          .select("id");
        if (updateError) throw updateError;

        // Row was deleted out from under us — fall through to an insert
        // instead of silently matching zero rows.
        if (!updated || updated.length === 0) {
          targetRow = null;
          savedLogId = null;
        }
      }

      if (!targetRow) {
        const { data: inserted, error: insertError } = await supabase
          .from("production_logs")
          .insert([buildLogRow(null)])
          .select("id")
          .single();

        if (insertError) {
          // 23505 = unique violation: another terminal created this shift's
          // row between our lookup and this insert, and the
          // one-row-per-shift-per-day index from production_logs_dedupe.sql
          // caught it. Re-resolve and update that row instead of duplicating.
          if (insertError.code !== "23505") throw insertError;

          const racedRow = await findShiftLogRow();
          if (!racedRow) throw insertError;

          const { error: retryError } = await supabase
            .from("production_logs")
            .update(buildLogRow(racedRow.cycles))
            .eq("id", racedRow.id);
          if (retryError) throw retryError;

          savedLogId = String(racedRow.id);
        } else if (inserted?.id) {
          savedLogId = String(inserted.id);
        }
      }

      if (savedLogId) {
        localStorage.setItem("production_log_id", savedLogId);
      }

      // End Shift: the final cycle is now safely archived above, so clear
      // live_log (+ shift_messages) so the Press Live Log Table is empty and
      // ready for the next shift. Isolated try/catch — a failure here must
      // not make this look like the cycle itself failed to save.
      if (!continueChain) {
        try {
          await clearLiveLog();
        } catch (clearErr) {
          console.error("Error clearing live log after End Shift:", clearErr);
          toast.error(
            `Shift closed and saved, but the live log table could not be cleared automatically: ${clearErr instanceof Error ? clearErr.message : String(clearErr)}. Clear it manually from Press Live Log Table.`,
          );
        }
      }

      const newCycleEntry = {
        id: Math.random().toString(36).substring(2, 9),
        pressNumber,
        date: currentDate,
        operator,
        shift,
        startTime,
        endTime: endTimeHHMM,
        runTime,
        loadTime: durationMinutes,
        tableMatTypes,
        selectedTableSquares,
        notes,
        timestamp: Date.now(),
      };

      const existingRecords = JSON.parse(
        localStorage.getItem("production_cycles") || "[]",
      );
      existingRecords.unshift(newCycleEntry);
      localStorage.setItem(
        "production_cycles",
        JSON.stringify(existingRecords),
      );

      if (continueChain) {
        setStartTime(endTimeHHMM);
      } else {
        setStartTime("");
        localStorage.removeItem("ws_start_time");
      }
      setIsManualStart(false);
      setSelectedTableSquares({});
      setNotes("");

      localStorage.removeItem("ws_selected_squares");
      localStorage.removeItem("ws_notes");

      localStorage.setItem("shift_panel_open", "false");
      setIsShiftOpen(false);
      setIsSubmitting(false);

      toast.success(
        `Cycle saved! Load time: ${formatSigned(durationMinutes * 60)}${
          continueChain ? " — next cycle started." : " — shift closed."
        }`,
      );
      const minutes = parseInt(String(runTime), 10);
      if (!isNaN(minutes) && minutes > 0 && onStartTimer) {
        onStartTimer(minutes);
      }
    } catch (err) {
      console.error("Error submitting:", err);
      alert(
        `Failed to submit entry: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  // Shared by the regular per-cycle submit (auto-chains into the next cycle)
  // and End Shift (closes the chain instead) — mirrors BalesForm's
  // runWithStaleCheck, since both finalize paths need the same
  // stale-live_log guard with only the chain behavior differing.
  const finalizeCycle = async (continueChain: boolean) => {
    if (!startTime) return;

    // Captured once, at the moment of submit, so the eventual end time
    // reflects when the operator actually tapped the button — not whenever a
    // stale-clear confirmation dialog happens to get dismissed.
    const endTimeHHMM = nowHHMM();
    const durationMinutes = computeDurationMinutes(endTimeHHMM);
    if (durationMinutes < 1) {
      toast.error(
        "Load/unload duration must be at least 1 minute — check the configured Run Time.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // live_log is a single shared table (shift_id hardcoded to 1), so it can
      // hold cycles belonging to a shift other than the one being submitted —
      // check before mixing them into this shift's cycle sequence.
      const { count, error: countError } = await supabase
        .from("live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);

      if (countError) throw countError;

      if (count && count > 0) {
        // Whether those cycles are stale is a question about *this* shift, and
        // only history can answer it: a row exists for today's date + shift
        // group exactly when the shift is already open, and then the cycles
        // are live — this terminal is simply joining it (the operator's phone
        // as a second terminal, or a browser that dropped its storage), so
        // offering to wipe them mid-shift would be destructive and wrong.
        //
        // The cached production_log_id can't answer it. It may be absent on a
        // terminal joining a live shift, and it may be present but point at a
        // *different* shift's row — after switching Shift Group day→night, or
        // once the Perth date has rolled over — where the leftover cycles
        // really are stale and used to be swept in silently.
        const openShiftRow = await findShiftLogRow();

        if (!openShiftRow) {
          setStaleClearConfirm({ count });
          setPendingProceed(
            () => () => submitCycle(endTimeHHMM, durationMinutes, continueChain),
          );
          setIsSubmitting(false);
          return;
        }
      }

      await submitCycle(endTimeHHMM, durationMinutes, continueChain);
    } catch (err) {
      console.error("Error checking for leftover shift data:", err);
      toast.error(
        `Could not check for leftover shift data. Submit cancelled: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    // Actual submission is gated behind the press-and-hold confirm on the
    // Submit button itself — this only exists to stop native form submission
    // (e.g. Enter in a text field) from bypassing that hold.
    e.preventDefault();
  };

  const cancelHold = () => {
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    holdRafRef.current = null;
    holdStartRef.current = null;
    setHoldProgress(0);
  };

  const tickHold = (timestamp: number) => {
    if (holdStartRef.current === null) return;
    const pct = Math.min(
      100,
      ((timestamp - holdStartRef.current) / HOLD_DURATION_MS) * 100,
    );
    setHoldProgress(pct);
    if (pct >= 100) {
      cancelHold();
      finalizeCycle(true);
      return;
    }
    holdRafRef.current = requestAnimationFrame(tickHold);
  };

  const startHold = () => {
    if (isSubmitting || !startTime || !session) return;
    holdStartRef.current = performance.now();
    holdRafRef.current = requestAnimationFrame(tickHold);
  };

  useEffect(() => {
    if (isSubmitting || !startTime || !session) cancelHold();
  }, [isSubmitting, startTime, session]);

  useEffect(() => {
    return () => {
      if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
    };
  }, []);

  const handleEndShift = () => finalizeCycle(false);

  const handleCancelClearStale = () => {
    setStaleClearConfirm(null);
    setPendingProceed(null);
    setIsSubmitting(false);
    toast.info("Submit cancelled — leftover live log data was not cleared.");
  };

  const handleConfirmClearStale = async () => {
    if (!staleClearConfirm) return;
    const clearedCount = staleClearConfirm.count;
    setIsSubmitting(true);

    try {
      await clearLiveLog();

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
        `Failed to clear leftover live log data. Submit cancelled: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md ipad:max-w-5xl mx-auto p-3 ipad:p-4 space-y-4 ipad:space-y-2 pb-12 ipad:pb-4">
      {/* Header Info Banner */}
      <div className="bg-primary text-primary-foreground p-4 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] flex items-center gap-4">
        <Select value={pressNumber} onValueChange={setPressNumber}>
          <SelectTrigger className="w-[120px] h-9 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground font-medium focus:ring-ring">
            <SelectValue placeholder="Select Press" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Press #1</SelectItem>
            <SelectItem value="2">Press #2</SelectItem>
          </SelectContent>
        </Select>

        {onNavigateToTable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNavigateToTable}
            className="ml-auto gap-1.5 h-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs"
          >
            <FileText className="w-4 h-4" /> Table
          </Button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 ipad:space-y-0 ipad:grid ipad:grid-cols-2 ipad:gap-4 ipad:items-start"
      >
      <div className="space-y-4 ipad:space-y-3">
        {/* Collapsible Shift / Metadata Card */}
        <Card className="overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => setIsShiftOpen(!isShiftOpen)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-accent transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-sm font-semibold uppercase text-accent-ink tracking-wide block">
                  Shift Information
                </span>
                {!isShiftOpen && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {operator || "No Name"} •{" "}
                    {shift === "day" ? "Day" : "Night"} • Run:{" "}
                    {runTime || "---"}m • {currentDate || "---"}
                  </p>
                )}
              </div>
            </div>
            {isShiftOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
          </button>

          {isShiftOpen && (
            <CardContent className="p-4 pt-2 border-t border-border space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Shift Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={currentDate}
                    readOnly
                    className="bg-muted cursor-not-allowed text-muted-foreground select-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="operator">Operator Name</Label>
                  <Input
                    id="operator"
                    placeholder="First Name"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shift">Shift Group</Label>
                  <Select value={shift} onValueChange={setShift}>
                    <SelectTrigger id="shift">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day Shift</SelectItem>
                      <SelectItem value="night">Night Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="runTime">Run Time (min)</Label>
                  <Input
                    type="number"
                    id="runTime"
                    placeholder="Minutes"
                    value={runTime}
                    onChange={(e) =>
                      setRunTime(e.target.value ? Number(e.target.value) : "")
                    }
                  />
                </div>
              </div>

              {/* Table Setup */}
              <div className="pt-2 border-t border-border space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Table Setup (Mat type)
                </span>
                <div className="w-full max-w-[440px] flex flex-col gap-2.5">
                  {[1, 2, 3, 4].map((tableId) => (
                    <div
                      key={tableId}
                      className="flex items-center gap-1.5 w-full"
                    >
                      <span className="text-xs font-bold text-muted-foreground w-3 shrink-0 text-left">
                        {tableId}
                      </span>

                      <RadioGroup
                        value={tableMatTypes[tableId] || ""}
                        onValueChange={(val) =>
                          handleMatSetupSelect(tableId, val)
                        }
                        className="grid grid-cols-5 gap-1 flex-1 w-full"
                      >
                        {["DF", "DD", "CF", "CD", "SG"].map((type) => (
                          <div key={type} className="flex items-center w-full">
                            <RadioGroupItem
                              value={type}
                              id={`msetup-${tableId}-${type}`}
                              className="sr-only"
                            />
                            <Label
                              htmlFor={`msetup-${tableId}-${type}`}
                              className={`h-7 w-full px-1 border rounded flex items-center justify-between gap-0.5 text-[10px] font-bold cursor-pointer transition-all select-none ${
                                tableMatTypes[tableId] === type
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border bg-card hover:bg-accent text-foreground"
                              }`}
                            >
                              <span className="font-mono tracking-tighter">
                                {type}
                              </span>
                              <div
                                className={`w-1 h-1 rounded-full shrink-0 ${
                                  tableMatTypes[tableId] === type
                                    ? "bg-primary-foreground"
                                    : "bg-border"
                                }`}
                              />
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={!session || isSubmitting || !startTime}
                  onClick={() => setEndShiftConfirmOpen(true)}
                  className="w-full h-9 flex items-center justify-center gap-1.5 text-[11px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-md uppercase tracking-wider transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  End Shift — Close Cycle Chain
                </button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Timestamps & Durations */}
        <Card>
          <CardHeader className="p-4 pb-2 ipad:p-3 ipad:pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Timestamps &
              Durations
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetStartTime}
              className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border hover:border-destructive/30 transition-colors gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0 ipad:p-3 ipad:pt-0 space-y-4 ipad:space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{startTime ? "Cycle Started At" : "Start Time"}</Label>
                <button
                  type="button"
                  onClick={() => setIsManualStart(!isManualStart)}
                  className="text-[10px] font-bold text-primary hover:text-accent-ink transition-colors uppercase tracking-wider"
                >
                  {isManualStart ? "● Tap Mode" : "✎ Manual"}
                </button>
              </div>
              {isManualStart ? (
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-12 ipad:h-10 text-center font-mono font-bold text-sm bg-primary/5 border-primary/30 focus-visible:ring-primary"
                />
              ) : startTime ? (
                <div className="h-12 ipad:h-10 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-accent-chip/50 text-accent-ink font-bold tracking-wide font-mono">
                  {startTime}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 ipad:h-10 font-bold tracking-wide border-dashed border-2 border-primary bg-accent-chip/50 text-accent-ink"
                  onClick={handleStartTap}
                >
                  TAP TO START
                </Button>
              )}
              {startTime && liveDurationSeconds !== null && (
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span
                      className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        liveDurationSeconds < 0
                          ? "bg-warning"
                          : "bg-success"
                      }`}
                    />
                    Load Time
                  </span>
                  <span
                    className={`font-mono font-bold text-lg tabular-nums ${
                      liveDurationSeconds < 0
                        ? "text-warning"
                        : "text-success"
                    }`}
                  >
                    {formatSigned(liveDurationSeconds)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 ipad:space-y-3">
        {/* Tables - Short Molding */}
        <Card>
          <CardHeader className="p-4 pb-2 ipad:p-3 ipad:pb-1.5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Tables -
              Short Molding
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetShortMolding}
              className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border hover:border-destructive/30 transition-colors gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Matrix
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-2 ipad:p-3 ipad:pt-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 ipad:gap-y-3">
              {[1, 2, 3, 4].map((tableNum) => (
                <div key={tableNum} className="flex items-start gap-2">
                  <span className="text-2xl font-bold text-foreground pt-1 select-none">
                    {tableNum}
                  </span>
                  <RadioGroup
                    value={selectedTableSquares[tableNum] || ""}
                    onValueChange={(val) => handleSquareSelect(tableNum, val)}
                    className="flex flex-row gap-1.5"
                  >
                  <div className="grid grid-cols-3 gap-1.5 relative w-[100px] h-[100px] ipad:w-[118px] ipad:h-[118px]">
                    <div className="absolute top-0 left-0">
                      <RadioGroupItem
                        value="top-left"
                        id={`t${tableNum}-tl`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-tl`}
                        className={`w-[28px] h-[28px] ipad:w-[32px] ipad:h-[32px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "top-left" ? "border-primary bg-accent-chip text-accent-ink shadow-sm" : "border-border hover:bg-accent"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "top-left" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>
                    <div className="absolute top-0 right-0">
                      <RadioGroupItem
                        value="top-right"
                        id={`t${tableNum}-tr`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-tr`}
                        className={`w-[28px] h-[28px] ipad:w-[32px] ipad:h-[32px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "top-right" ? "border-primary bg-accent-chip text-accent-ink shadow-sm" : "border-border hover:bg-accent"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "top-right" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>
                    <div className="absolute top-[36px] left-[36px] ipad:top-[43px] ipad:left-[43px]">
                      <RadioGroupItem
                        value="center"
                        id={`t${tableNum}-cc`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-cc`}
                        className={`w-[28px] h-[28px] ipad:w-[32px] ipad:h-[32px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "center" ? "border-primary bg-accent-chip text-accent-ink shadow-sm" : "border-border hover:bg-accent"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "center" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>
                    <div className="absolute bottom-0 left-0">
                      <RadioGroupItem
                        value="bottom-left"
                        id={`t${tableNum}-bl`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-bl`}
                        className={`w-[28px] h-[28px] ipad:w-[32px] ipad:h-[32px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "bottom-left" ? "border-primary bg-accent-chip text-accent-ink shadow-sm" : "border-border hover:bg-accent"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "bottom-left" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>
                    <div className="absolute bottom-0 right-0">
                      <RadioGroupItem
                        value="bottom-right"
                        id={`t${tableNum}-br`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-br`}
                        className={`w-[28px] h-[28px] ipad:w-[32px] ipad:h-[32px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "bottom-right" ? "border-primary bg-accent-chip text-accent-ink shadow-sm" : "border-border hover:bg-accent"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "bottom-right" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>
                  </div>
                  <div className="h-[100px] ipad:h-[118px]">
                    <RadioGroupItem
                      value="bubble"
                      id={`t${tableNum}-bubble`}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`t${tableNum}-bubble`}
                      className={`h-full w-7 border-2 rounded flex items-center justify-center text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-all [writing-mode:vertical-rl] ${selectedTableSquares[tableNum] === "bubble" ? "border-primary bg-accent-chip text-accent-ink shadow-sm" : "border-border bg-card hover:bg-accent text-foreground"}`}
                    >
                      Bubble
                    </Label>
                  </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

        {/* Freeform Machine Notes */}
        <Card className="ipad:col-span-2">
          <CardContent className="p-4 space-y-1.5">
            <Label htmlFor="notes">Mechanical Faults / Cycle Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Upper right vacuum pad missed placement..."
              className="resize-none min-h-[70px] ipad:min-h-[50px]"
            />
          </CardContent>
        </Card>

        {/* Global Submit Trigger */}
        <Button
          type="button"
          disabled={session ? isSubmitting || !startTime : true}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
              e.preventDefault();
              startHold();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter" || e.key === " ") cancelHold();
          }}
          className="relative overflow-hidden w-full h-12 ipad:h-10 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-bold tracking-wide uppercase text-sm shadow-md transition-colors ipad:col-span-2"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 bg-primary-foreground/25"
            style={{ width: `${holdProgress}%` }}
          />
          {isSubmitting && <Loader2 className="animate-spin" size={20} />}
          {holdProgress > 0 && !isSubmitting
            ? "Hold to Confirm…"
            : session
              ? startTime
                ? "Submit Cycle Entry"
                : "Tap Start Time to Submit"
              : "Login to submit cycle"}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground pt-0.5 ipad:col-span-2">
          Press and hold to confirm submission
        </p>
      </form>

      <Dialog
        open={!!staleClearConfirm}
        onOpenChange={(open) => {
          if (!open) handleCancelClearStale();
        }}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Leftover Shift Data Found
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Starting the <strong>{shift === "night" ? "Night" : "Day"}</strong>{" "}
            shift. The live log still has{" "}
            <strong>{staleClearConfirm?.count}</strong> cycle
            {staleClearConfirm?.count === 1 ? "" : "s"} left over from the
            previous shift — normal if it just ended. Clear it to start
            fresh?
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

      <Dialog open={endShiftConfirmOpen} onOpenChange={setEndShiftConfirmOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              End Shift?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This submits the current cycle (started at{" "}
            <strong>{startTime}</strong>), closes the chain, and clears the
            Press Live Log Table so it's ready for the next shift — you'll
            need to tap Start Time again to begin a new cycle. Use this only
            for the last cycle of the shift.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEndShiftConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setEndShiftConfirmOpen(false);
                handleEndShift();
              }}
            >
              End Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
