"use client";

import { supabase } from "@/lib/supabase";
import {
  mergeCycles,
  shiftGroupOf,
  describeError,
  isMissingColumnError,
  BANBURY_DEFAULT_RUN_TIME_MINUTES,
  checkDowntimeMinutes,
  isCheckOverrun,
} from "@/lib/banbury-log";
import type { BanburyCheckEntry } from "@/lib/banbury-log";
import { LINE_ACCOUNTS } from "@/lib/line-accounts";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  FlaskConical,
  ListChecks,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings2,
  Loader2,
  RotateCcw,
} from "lucide-react";

/** The banbury_production_logs columns read back when resolving a shift's archive row. */
interface BanburyShiftLogRowRef {
  id: number;
  operator_shift: string;
  checks: unknown;
}

/** The six material/chemical checks on the paper sheet, default-checked since
 *  the sheet is overwhelmingly all-ticked on every row -- the operator only
 *  has to un-tick what wasn't actually checked this pass.
 *
 *  That "un-tick the exceptions" flow is what drives the buttons' inverted
 *  colouring in the grid below: an untouched button is PRIMARY (checked, the
 *  default, themed the same as every other primary action in the app), and
 *  tapping SELECTS it as an exception, turning it muted grey. So primary is
 *  the resting state and grey is the deliberate one -- the opposite of a
 *  normal toggle, and the reason logging a check is NOT gated on all six
 *  being checked (a grey tick is a legitimate thing to record). */
const TICK_FIELDS = [
  { key: "crumbRubber", label: "Crumb Rubber" },
  { key: "otherRubbers", label: "Other Rubbers" },
  { key: "powderedChemicals", label: "Powdered Chemicals" },
  { key: "rpo", label: "RPO" },
  { key: "sulphur", label: "Sulphur" },
  { key: "liquidChemicals", label: "Liquid Chemicals" },
] as const;

type TickKey = (typeof TICK_FIELDS)[number]["key"];
type Ticks = Record<TickKey, boolean>;

const DEFAULT_TICKS: Ticks = {
  crumbRubber: true,
  otherRubbers: true,
  powderedChemicals: true,
  rpo: true,
  sulphur: true,
  liquidChemicals: true,
};

// The two banbury_live_log columns that only exist once
// banbury_live_log_add_start_time.sql has been run against the database --
// the pair logCheck drops and warns about when PostgREST says they're not
// there. See lib/shift-log.ts's isMissingColumnError.
const CYCLE_TIMING_COLUMNS = ["start_time", "run_time_minutes"] as const;

interface RecentCheckRow {
  banbury_id: number;
  check_number: number;
  check_time: string | null;
  // Optional: absent entirely until banbury_live_log_add_start_time.sql runs.
  run_time_minutes?: number | null;
  right_tank_level: string | null;
  left_tank_level: string | null;
  notes: string | null;
}

export default function BanburyForm({
  session,
  onNavigateToTable,
}: {
  session: any;
  onNavigateToTable?: () => void;
}) {
  const isAuthorized = session?.user?.email === LINE_ACCOUNTS.banbury;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staleClearConfirm, setStaleClearConfirm] = useState<{
    count: number;
  } | null>(null);
  const [pendingProceed, setPendingProceed] = useState<
    (() => Promise<void>) | null
  >(null);

  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("banbury_shift_panel_open");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [operator, setOperator] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("banbury_shift_operator") || "";
    }
    return "";
  });

  const [shift, setShift] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("banbury_shift_group") || "day";
    }
    return "day";
  });

  const [product, setProduct] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("banbury_shift_product") || "";
    }
    return "";
  });

  const [bagWeight, setBagWeight] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("banbury_shift_bag_weight");
      return saved !== null && saved !== "" ? Number(saved) : 700;
    }
    return 700;
  });

  const [batchesMade, setBatchesMade] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("banbury_shift_batches_made");
      return saved !== null && saved !== "" ? Number(saved) : "";
    }
    return "";
  });

  const [bagsCount, setBagsCount] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("banbury_shift_bags_count");
      return saved !== null && saved !== "" ? Number(saved) : "";
    }
    return "";
  });

  const [runTimeHours, setRunTimeHours] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("banbury_shift_run_time");
      return saved !== null && saved !== "" ? Number(saved) : "";
    }
    return "";
  });

  const [ticks, setTicks] = useState<Ticks>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("banbury_ws_ticks");
      return saved ? { ...DEFAULT_TICKS, ...JSON.parse(saved) } : DEFAULT_TICKS;
    }
    return DEFAULT_TICKS;
  });

  // --- ACTIVE CHECK-CYCLE VALUES ---
  // The currently OPEN check cycle's start time (HH:MM Perth), or "" when no
  // cycle is running -- its presence is the "is a check cycle open" flag,
  // exactly as in PressForm/BalesForm. The operator taps to open the cycle,
  // works through the checklist and the tank levels, then logs it; logging
  // stamps the cycle's end and immediately opens the next one, so the elapsed
  // readout doubles as "time since the last check".
  const [startTime, setStartTime] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("banbury_ws_start_time") || "";
    }
    return "";
  });

  // Manual input switch, for back-filling a check cycle that was started away
  // from the terminal (mirrors PressForm's lunch/break override).
  const [isManualStart, setIsManualStart] = useState<boolean>(false);

  const [rightTank, setRightTank] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("banbury_ws_right_tank") || "";
    }
    return "";
  });

  const [leftTank, setLeftTank] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("banbury_ws_left_tank") || "";
    }
    return "";
  });

  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("banbury_ws_notes") || "";
    }
    return "";
  });

  const [currentDate, setCurrentDate] = useState<string>("");
  const [recentChecks, setRecentChecks] = useState<RecentCheckRow[]>([]);

  // Tonnes = Bags x Bag Weight / 1000 | Average Output P/H = Tonnes / Run Time,
  // exactly as printed on the paper sheet.
  const tonnes = ((Number(bagsCount) || 0) * (Number(bagWeight) || 0)) / 1000;
  const averageOutputPH =
    Number(runTimeHours) > 0 ? tonnes / Number(runTimeHours) : 0;

  // --- AUTOMATED DISPATCH WATCHERS & POLL SYNCING (banbury_* keys only) ---
  useEffect(() => {
    const handleStorageChange = () => {
      const savedState = localStorage.getItem("banbury_shift_panel_open");
      setIsShiftOpen(savedState !== null ? savedState === "true" : true);
      setOperator(localStorage.getItem("banbury_shift_operator") || "");
      setShift(localStorage.getItem("banbury_shift_group") || "day");
      setProduct(localStorage.getItem("banbury_shift_product") || "");

      const savedWeight = localStorage.getItem("banbury_shift_bag_weight");
      setBagWeight(
        savedWeight !== null ? (savedWeight === "" ? "" : Number(savedWeight)) : 700,
      );
      const savedBatches = localStorage.getItem("banbury_shift_batches_made");
      setBatchesMade(
        savedBatches !== null ? (savedBatches === "" ? "" : Number(savedBatches)) : "",
      );
      const savedBags = localStorage.getItem("banbury_shift_bags_count");
      setBagsCount(
        savedBags !== null ? (savedBags === "" ? "" : Number(savedBags)) : "",
      );
      const savedRunTime = localStorage.getItem("banbury_shift_run_time");
      setRunTimeHours(
        savedRunTime !== null ? (savedRunTime === "" ? "" : Number(savedRunTime)) : "",
      );

      setStartTime(localStorage.getItem("banbury_ws_start_time") || "");
      const savedTicks = localStorage.getItem("banbury_ws_ticks");
      setTicks(savedTicks ? { ...DEFAULT_TICKS, ...JSON.parse(savedTicks) } : DEFAULT_TICKS);
      setRightTank(localStorage.getItem("banbury_ws_right_tank") || "");
      setLeftTank(localStorage.getItem("banbury_ws_left_tank") || "");
      setNotes(localStorage.getItem("banbury_ws_notes") || "");
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("banbury_shift_panel_open", String(isShiftOpen));
  }, [isShiftOpen]);
  useEffect(() => {
    localStorage.setItem("banbury_shift_operator", operator);
  }, [operator]);
  useEffect(() => {
    localStorage.setItem("banbury_shift_group", shift);
  }, [shift]);
  useEffect(() => {
    localStorage.setItem("banbury_shift_product", product);
  }, [product]);
  useEffect(() => {
    localStorage.setItem("banbury_shift_bag_weight", String(bagWeight));
  }, [bagWeight]);
  useEffect(() => {
    localStorage.setItem("banbury_shift_batches_made", String(batchesMade));
  }, [batchesMade]);
  useEffect(() => {
    localStorage.setItem("banbury_shift_bags_count", String(bagsCount));
  }, [bagsCount]);
  useEffect(() => {
    localStorage.setItem("banbury_shift_run_time", String(runTimeHours));
  }, [runTimeHours]);

  // Broadcast the current Banbury shift config (setup + live totals) to the
  // DB so any viewer sees the live shift. Debounced; only logged-in
  // operators write.
  useEffect(() => {
    if (!isAuthorized) return;
    const t = setTimeout(() => {
      supabase
        .from("banbury_shift_config")
        .upsert(
          {
            shift_id: 1,
            operator,
            shift_group: shift,
            product,
            bag_weight_kg: bagWeight === "" ? null : Number(bagWeight),
            batches_made: batchesMade === "" ? 0 : Number(batchesMade),
            mesh_bags_count: bagsCount === "" ? 0 : Number(bagsCount),
            run_time_minutes: Math.round(Number(runTimeHours || 0) * 60),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "shift_id" },
        )
        .then(({ error }) => {
          if (error) console.error("banbury_shift_config upsert failed", error);
        });
    }, 600);
    return () => clearTimeout(t);
  }, [isAuthorized, operator, shift, product, bagWeight, batchesMade, bagsCount, runTimeHours]);

  useEffect(() => {
    localStorage.setItem("banbury_ws_start_time", startTime);
  }, [startTime]);
  useEffect(() => {
    localStorage.setItem("banbury_ws_ticks", JSON.stringify(ticks));
  }, [ticks]);
  useEffect(() => {
    localStorage.setItem("banbury_ws_right_tank", rightTank);
  }, [rightTank]);
  useEffect(() => {
    localStorage.setItem("banbury_ws_left_tank", leftTank);
  }, [leftTank]);
  useEffect(() => {
    localStorage.setItem("banbury_ws_notes", notes);
  }, [notes]);

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Perth",
    }).format(new Date());
    setCurrentDate(formatted);
  }, []);

  const fetchRecentChecks = async () => {
    // Deliberately "*" rather than a column list: banbury_live_log gains
    // columns through hand-run scripts (banbury_live_log_add_start_time.sql),
    // and naming run_time_minutes here would make the whole Recent Checks
    // panel fail with 42703 on a database that hasn't had that script applied
    // yet. RecentCheckRow's extra fields just come back undefined instead.
    const { data } = await supabase
      .from("banbury_live_log")
      .select("*")
      .eq("shift_id", 1)
      .order("check_number", { ascending: false })
      .limit(5);
    if (data) setRecentChecks(data as RecentCheckRow[]);
  };

  useEffect(() => {
    fetchRecentChecks();
  }, []);

  const toggleTick = (key: TickKey) => {
    setTicks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const nowHHMM = () =>
    new Date().toTimeString().split(" ")[0].substring(0, 5);

  const toTimestampIso = (hhmm: string) =>
    new Date(`${currentDate}T${hhmm}:00+08:00`).toISOString();

  const handleStartTap = () => {
    setStartTime(nowHHMM());
  };

  const handleResetStartTime = () => {
    setStartTime("");
    setIsManualStart(false);
  };

  // Elapsed minutes between the open cycle's start and the moment it's
  // logged. Unlike PressForm there is no configured per-cycle run time to
  // subtract -- a Banbury check has no machine cycle behind it, so the whole
  // interval is the figure worth keeping, and it is that interval that gets
  // measured against BANBURY_DEFAULT_RUN_TIME_MINUTES to give the shift's
  // downtime. Midnight crossover is handled the same way PressForm's
  // computeDurationMinutes does it.
  const computeDurationMinutes = (endTimeHHMM: string) => {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTimeHHMM.split(":").map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;

    if (endTotalMinutes < startTotalMinutes) endTotalMinutes += 24 * 60;
    return Math.max(0, endTotalMinutes - startTotalMinutes);
  };

  // Live 1-second ticker driving the elapsed readout while a check cycle is
  // open (PressForm's Load Time counter, without the run-time offset).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const elapsedSeconds = (() => {
    if (!startTime) return null;
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const startTotalSeconds = (startHours * 60 + startMinutes) * 60;
    const now = new Date(nowTick);
    let nowTotalSeconds =
      now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    if (nowTotalSeconds < startTotalSeconds) nowTotalSeconds += 24 * 3600;
    return nowTotalSeconds - startTotalSeconds;
  })();

  const formatElapsed = (totalSeconds: number) => {
    const abs = Math.max(0, totalSeconds);
    const hh = Math.floor(abs / 3600);
    const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
    const ss = String(Math.floor(abs % 60)).padStart(2, "0");
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  // Live downtime for the open cycle: how far past the standard 14-minute
  // check cycle it has run. Counts UP from -14:00 the way PressForm's Load
  // Time readout counts up from minus the press run time, so the operator
  // sees the cycle burning down to zero and then, past it, the downtime the
  // shift is actually accruing.
  const downtimeSeconds =
    elapsedSeconds === null
      ? null
      : elapsedSeconds - BANBURY_DEFAULT_RUN_TIME_MINUTES * 60;

  const formatSigned = (totalSeconds: number) => {
    const sign = totalSeconds < 0 ? "-" : "+";
    const abs = Math.abs(totalSeconds);
    const mm = String(Math.floor(abs / 60)).padStart(2, "0");
    const ss = String(Math.floor(abs % 60)).padStart(2, "0");
    return `${sign}${mm}:${ss}`;
  };

  // Log Check is gated the same way PressForm gates its submit button (a
  // plain disabled condition): a check cycle has to be open and both tank
  // levels have to carry a value. The six ticks are deliberately NOT part of
  // this -- they default to checked and turning one grey is a finding the
  // operator needs to be able to record, not something to block on.
  const cycleOpen = startTime !== "";
  const tanksFilled = rightTank.trim() !== "" && leftTank.trim() !== "";
  const canLogCheck = cycleOpen && tanksFilled;
  const flaggedCount = TICK_FIELDS.filter((f) => !ticks[f.key]).length;

  // banbury_production_logs holds exactly ONE row per (date, shift group),
  // same resolution strategy as Press/Bales' findShiftLogRow -- the database
  // is the authority, localStorage is only a per-browser fast path.
  const findShiftLogRow = async (): Promise<BanburyShiftLogRowRef | null> => {
    const { data: sameDateRows, error: lookupError } = await supabase
      .from("banbury_production_logs")
      .select("id, operator_shift, checks")
      .eq("date", currentDate)
      .order("id", { ascending: true });
    if (lookupError) throw lookupError;

    const group = shiftGroupOf(`${operator} (${shift})`);
    const matches = ((sameDateRows || []) as BanburyShiftLogRowRef[]).filter(
      (r) => shiftGroupOf(r.operator_shift) === group,
    );
    const cachedId = localStorage.getItem("banbury_production_log_id");
    return matches.find((r) => String(r.id) === cachedId) || matches[0] || null;
  };

  // Logs one checklist entry and re-aggregates the shift's archive row --
  // mirrors PressForm/BalesForm's submitCycle. A check cycle spans the tap
  // that opened it to the moment it's logged, so the row carries start_time,
  // check_time (the end) and the minutes between them; there is still no
  // per-entry output, because the shift's totals (Batches Made, # Bags,
  // Tonnes, Run Time, Average Output P/H) are scalars snapshotted straight
  // from banbury_shift_config, not derived from the checks array.
  const logCheck = async (endTimeHHMM: string, durationMinutes: number) => {
    try {
      const { data: latestEntry, error: fetchError } = await supabase
        .from("banbury_live_log")
        .select("check_number")
        .order("check_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const nextCheckNumber = (latestEntry?.check_number || 0) + 1;
      const nowIso = new Date().toISOString();
      const startTimestamp = toTimestampIso(startTime);
      const endTimestamp = toTimestampIso(endTimeHHMM);

      // Split deliberately: basePayload is the shape banbury_live_log has
      // always had, and CYCLE_TIMING_COLUMNS is the pair added later by the
      // hand-run banbury_live_log_add_start_time.sql. Keeping them separable
      // is what lets the insert below retry without them.
      const basePayload = {
        shift_id: 1,
        check_number: nextCheckNumber,
        check_time: endTimestamp,
        crumb_rubber: ticks.crumbRubber,
        other_rubbers: ticks.otherRubbers,
        powdered_chemicals: ticks.powderedChemicals,
        rpo: ticks.rpo,
        sulphur: ticks.sulphur,
        liquid_chemicals: ticks.liquidChemicals,
        right_tank_level: rightTank || null,
        left_tank_level: leftTank || null,
        notes,
        updated_at: nowIso,
      };
      const payload = {
        ...basePayload,
        start_time: startTimestamp,
        run_time_minutes: durationMinutes,
      };

      // Against a database that hasn't had that script applied -- or whose
      // PostgREST is still serving a pre-ALTER schema cache -- this insert
      // comes back as PGRST204 ("Could not find the 'run_time_minutes' column
      // of 'banbury_live_log' in the schema cache") and the operator's whole
      // check is lost mid-shift. Losing the check is far worse than losing its
      // two timing fields, so fall back to the pre-migration shape and say
      // loudly what needs running, in the same spirit as the 23505 retry
      // further down.
      let timingColumnsMissing = false;
      const { error } = await supabase.from("banbury_live_log").insert([payload]);
      if (error) {
        if (!isMissingColumnError(error, CYCLE_TIMING_COLUMNS)) throw error;

        timingColumnsMissing = true;
        const { error: legacyError } = await supabase
          .from("banbury_live_log")
          .insert([basePayload]);
        if (legacyError) throw legacyError;
      }

      const { data: shiftRows } = await supabase
        .from("banbury_live_log")
        .select("*")
        .eq("shift_id", 1)
        .order("check_number", { ascending: true });

      const fmtPerth = (iso: string | null) =>
        iso
          ? new Intl.DateTimeFormat("en-GB", {
              timeZone: "Australia/Perth",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(iso))
          : null;

      // Rows logged before the check cycle gained a start time carry no
      // start_time at all. Those keep their original archive shape --
      // start_time = the check's own clock time, no end_time -- so
      // cycleKey/mergeCycles still match the entry already sitting in
      // banbury_production_logs.checks instead of appending a duplicate of
      // it under a new key.
      const aggregatedChecks: BanburyCheckEntry[] = (shiftRows || []).map(
        (r: any) => {
          const startPerth = fmtPerth(r.start_time);
          const checkPerth = fmtPerth(r.check_time);
          return {
            cycle_number: r.check_number,
            start_time: startPerth ?? checkPerth,
            end_time: startPerth ? checkPerth : null,
            run_time_minutes: r.run_time_minutes ?? null,
            crumb_rubber: r.crumb_rubber,
            other_rubbers: r.other_rubbers,
            powdered_chemicals: r.powdered_chemicals,
            rpo: r.rpo,
            sulphur: r.sulphur,
            liquid_chemicals: r.liquid_chemicals,
            right_tank_level: r.right_tank_level,
            left_tank_level: r.left_tank_level,
            notes: r.notes,
          };
        },
      );

      const operatorShift = `${operator} (${shift})`;
      const runTimeMinutesValue = Math.round(Number(runTimeHours || 0) * 60);

      const buildLogRow = (existingChecks: unknown) => ({
        date: currentDate,
        operator_shift: operatorShift,
        product,
        bag_weight_kg: bagWeight === "" ? null : Number(bagWeight),
        batches_made: batchesMade === "" ? 0 : Number(batchesMade),
        mesh_bags_count: bagsCount === "" ? 0 : Number(bagsCount),
        tonnes,
        run_time_minutes: runTimeMinutesValue,
        average_output_ph: averageOutputPH,
        checks: mergeCycles(existingChecks, aggregatedChecks),
      });

      let targetRow: BanburyShiftLogRowRef | null = await findShiftLogRow();
      let savedLogId: string | null = targetRow ? String(targetRow.id) : null;

      if (targetRow) {
        const { data: updated, error: updateError } = await supabase
          .from("banbury_production_logs")
          .update(buildLogRow(targetRow.checks))
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
          .from("banbury_production_logs")
          .insert([buildLogRow(null)])
          .select("id")
          .single();

        if (insertError) {
          if (insertError.code !== "23505") throw insertError;

          const racedRow = await findShiftLogRow();
          if (!racedRow) throw insertError;

          const { error: retryError } = await supabase
            .from("banbury_production_logs")
            .update(buildLogRow(racedRow.checks))
            .eq("id", racedRow.id);
          if (retryError) throw retryError;

          savedLogId = String(racedRow.id);
        } else if (inserted?.id) {
          savedLogId = String(inserted.id);
        }
      }

      if (savedLogId) {
        localStorage.setItem("banbury_production_log_id", savedLogId);
      }

      // Notes, ticks, and tank levels all reset per entry: ticks default
      // to all-checked (see DEFAULT_TICKS above) and both tank levels are
      // required on every check, so leaving a prior value in place would
      // either silently mis-mark or silently pre-fill the next check.
      setNotes("");
      localStorage.removeItem("banbury_ws_notes");
      setTicks(DEFAULT_TICKS);
      localStorage.removeItem("banbury_ws_ticks");
      setRightTank("");
      localStorage.removeItem("banbury_ws_right_tank");
      setLeftTank("");
      localStorage.removeItem("banbury_ws_left_tank");

      // Chain straight into the next check cycle, the way PressForm rolls a
      // finished cycle's end time into the next one's start -- the elapsed
      // readout then measures the gap since this check.
      setStartTime(endTimeHHMM);
      setIsManualStart(false);

      setIsSubmitting(false);
      const overrunMinutes = checkDowntimeMinutes(durationMinutes);
      toast.success(
        `Check #${nextCheckNumber} logged (${durationMinutes} min${
          overrunMinutes > 0 ? `, +${overrunMinutes}m downtime` : ""
        }) — next check cycle started.`,
      );
      if (timingColumnsMissing) {
        toast.warning(
          "Cycle times aren't being saved: banbury_live_log is missing its start_time / run_time_minutes columns. The check itself was logged. Run banbury_live_log_add_start_time.sql in the Supabase SQL editor to fix it.",
          { duration: 12000 },
        );
      }
      fetchRecentChecks();
    } catch (err) {
      console.error("Error logging check:", err);
      toast.error(
        `Failed to log check: ${describeError(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  // Checks for leftover live_log rows from an already-closed shift before
  // logging -- mirrors PressForm/BalesForm's stale-clear guard.
  const handleLogCheck = async () => {
    if (!isAuthorized || !canLogCheck) return;

    // Captured once, here, so the check's end time is when the operator
    // actually tapped Log Check -- not whenever a stale-clear confirmation
    // dialog happens to get dismissed (same reason PressForm captures it in
    // finalizeCycle rather than inside submitCycle).
    const endTimeHHMM = nowHHMM();
    const durationMinutes = computeDurationMinutes(endTimeHHMM);

    setIsSubmitting(true);
    try {
      const { count, error: countError } = await supabase
        .from("banbury_live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);
      if (countError) throw countError;

      if (count && count > 0) {
        const openShiftRow = await findShiftLogRow();
        if (!openShiftRow) {
          setStaleClearConfirm({ count });
          setPendingProceed(
            () => () => logCheck(endTimeHHMM, durationMinutes),
          );
          setIsSubmitting(false);
          return;
        }
      }

      await logCheck(endTimeHHMM, durationMinutes);
    } catch (err) {
      console.error("Error checking for leftover shift data:", err);
      toast.error(
        `Could not check for leftover shift data. Log cancelled: ${describeError(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  const handleCancelClearStale = () => {
    setStaleClearConfirm(null);
    setPendingProceed(null);
    setIsSubmitting(false);
    toast.info("Log cancelled — leftover live log data was not cleared.");
  };

  const handleConfirmClearStale = async () => {
    if (!staleClearConfirm) return;
    const clearedCount = staleClearConfirm.count;
    setIsSubmitting(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "reset_banbury_shift_log",
        { p_shift_id: "1" },
      );
      if (rpcError) throw rpcError;

      const { count: verifyCount, error: verifyError } = await supabase
        .from("banbury_live_log")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", 1);
      if (verifyError) throw verifyError;
      if (verifyCount && verifyCount > 0) {
        throw new Error(
          "Live log still has rows after clearing — check reset_banbury_shift_log RLS/permissions in Supabase.",
        );
      }

      setStaleClearConfirm(null);
      toast.warning(
        `Cleared ${clearedCount} leftover check${clearedCount === 1 ? "" : "s"} from a previous shift.`,
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
        `Failed to clear leftover live log data. Log cancelled: ${describeError(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md ipad:max-w-5xl mx-auto p-3 ipad:p-4 space-y-4 ipad:space-y-2 pb-12 ipad:pb-4">
      {/* Header Info Banner */}
      <div className="bg-primary text-primary-foreground p-4 rounded-[var(--radius-card)] shadow-[var(--shadow-card)] flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-wider uppercase whitespace-nowrap">
          Banbury
        </h1>

        {onNavigateToTable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNavigateToTable}
            className="ml-auto gap-1.5 h-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs"
          >
            <ListChecks className="w-4 h-4" /> Table
          </Button>
        )}
      </div>

      <div className="space-y-4 ipad:space-y-0 ipad:grid ipad:grid-cols-2 ipad:gap-4 ipad:items-start">
        <div className="space-y-4">
          {/* Collapsible Shift Information Card */}
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
                      {shift === "day" ? "Day" : "Night"} • Product:{" "}
                      {product || "---"} • {currentDate || "---"}
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
                    <Label htmlFor="banbury-date">Shift Date</Label>
                    <Input
                      id="banbury-date"
                      type="date"
                      value={currentDate}
                      readOnly
                      className="bg-muted cursor-not-allowed text-muted-foreground select-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banbury-operator">Operator Name</Label>
                    <Input
                      id="banbury-operator"
                      placeholder="First Name"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banbury-shift">Shift Group</Label>
                    <Select value={shift} onValueChange={setShift}>
                      <SelectTrigger id="banbury-shift">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banbury-product">Product</Label>
                    <Input
                      id="banbury-product"
                      placeholder="e.g. CB"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banbury-bag-weight">Bag Weight (kg)</Label>
                    <Input
                      type="number"
                      id="banbury-bag-weight"
                      placeholder="700"
                      value={bagWeight}
                      onChange={(e) =>
                        setBagWeight(e.target.value ? Number(e.target.value) : "")
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banbury-batches">Batches Made</Label>
                    <Input
                      type="number"
                      id="banbury-batches"
                      placeholder="e.g. 20"
                      value={batchesMade}
                      onChange={(e) =>
                        setBatchesMade(e.target.value ? Number(e.target.value) : "")
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banbury-bags"># 30 Mesh Bags</Label>
                    <Input
                      type="number"
                      id="banbury-bags"
                      placeholder="e.g. 16"
                      value={bagsCount}
                      onChange={(e) =>
                        setBagsCount(e.target.value ? Number(e.target.value) : "")
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="banbury-runtime">Run Time (hrs)</Label>
                    <Input
                      type="number"
                      id="banbury-runtime"
                      placeholder="e.g. 21.3"
                      step="0.1"
                      value={runTimeHours}
                      onChange={(e) =>
                        setRunTimeHours(e.target.value ? Number(e.target.value) : "")
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-md bg-muted/40 p-2.5 space-y-0.5">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                      Tonnes
                    </p>
                    <p className="text-sm font-black font-mono text-foreground">
                      {tonnes.toFixed(2)}
                    </p>
                  </div>
                  <div className="border border-border rounded-md bg-muted/40 p-2.5 space-y-0.5">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                      Average Output P/H
                    </p>
                    <p className="text-sm font-black font-mono text-foreground">
                      {averageOutputPH.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Check Cycle Card */}
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold uppercase text-accent-ink tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Check Cycle
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
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{cycleOpen ? "Cycle Started At" : "Start Time"}</Label>
                  <button
                    type="button"
                    onClick={() => setIsManualStart(!isManualStart)}
                    className="text-[10px] font-bold text-primary hover:text-accent-ink transition-colors uppercase tracking-wider rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {isManualStart ? "● Tap Mode" : "✎ Manual"}
                  </button>
                </div>
                {isManualStart ? (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-12 text-center font-mono font-bold text-sm bg-primary/5 border-primary/30 focus-visible:ring-primary"
                  />
                ) : cycleOpen ? (
                  <div className="h-12 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-accent-chip/50 text-accent-ink font-bold tracking-wide font-mono">
                    {startTime}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 font-bold tracking-wide border-dashed border-2 border-primary bg-accent-chip/50 text-accent-ink"
                    onClick={handleStartTap}
                  >
                    TAP TO START
                  </Button>
                )}
                {cycleOpen && elapsedSeconds !== null && downtimeSeconds !== null && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <span
                          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            downtimeSeconds > 0 ? "bg-destructive" : "bg-success"
                          }`}
                        />
                        {recentChecks.length > 0 ? "Since Last Check" : "Elapsed"}
                      </span>
                      <span
                        className={`font-mono font-bold text-lg tabular-nums ${
                          downtimeSeconds > 0 ? "text-destructive" : "text-success"
                        }`}
                      >
                        {formatElapsed(elapsedSeconds)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Downtime (Run: {BANBURY_DEFAULT_RUN_TIME_MINUTES}m)
                      </span>
                      <span
                        className={`font-mono font-bold text-xs tabular-nums ${
                          downtimeSeconds > 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatSigned(downtimeSeconds)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Log Check Card */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold uppercase text-accent-ink tracking-wide flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" /> Log Chemical
                / Tank Check
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Inverted toggles: all six start checked in the theme's
                  primary color (the paper sheet's normal row) and tapping
                  one SELECTS it as grey -- the operator only marks what
                  wasn't actually done. */}
              <div className="grid grid-cols-2 gap-2">
                {TICK_FIELDS.map((field) => {
                  const checked = ticks[field.key];
                  return (
                    <button
                      key={field.key}
                      type="button"
                      aria-pressed={!checked}
                      onClick={() => toggleTick(field.key)}
                      className={`h-11 rounded-[var(--radius-card)] border-[length:var(--border-width-card)] text-[11px] font-bold uppercase tracking-wide transition-colors px-1 flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-card)] hover:bg-primary/80"
                          : "border-muted-foreground/40 bg-muted text-muted-foreground shadow-inner hover:bg-muted/70"
                      }`}
                    >
                      <span className="leading-tight">
                        <span aria-hidden="true" className="text-xs mr-1">
                          {checked ? "✓" : "✗"}
                        </span>
                        {field.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug -mt-2">
                All six start checked. Tap any that weren&apos;t done — it
                turns grey and is logged as unchecked.
                {flaggedCount > 0 && (
                  <span className="font-bold text-foreground">
                    {" "}
                    {flaggedCount} marked unchecked.
                  </span>
                )}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="banbury-right-tank">Right Tank Level</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="banbury-right-tank"
                      placeholder="e.g. 302"
                      value={rightTank}
                      onChange={(e) => setRightTank(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRightTank("Full")}
                      className="shrink-0 text-[10px] font-bold uppercase"
                    >
                      Full
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="banbury-left-tank">Left Tank Level</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="banbury-left-tank"
                      placeholder="e.g. 314"
                      value={leftTank}
                      onChange={(e) => setLeftTank(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLeftTank("Full")}
                      className="shrink-0 text-[10px] font-bold uppercase"
                    >
                      Full
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banbury-notes">Notes / Issues</Label>
                <Textarea
                  id="banbury-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., RPO cold, slow to refill small kettle 15 min..."
                  className="resize-none min-h-[60px]"
                />
              </div>

              {/* disabled:opacity-100 is load-bearing: the Button primitive's
                  base disabled:opacity-50 is a group opacity that fades the fill
                  AND the label together against the card, which collapsed the
                  disabled tokens below to ~2:1 in every theme. The label is the
                  only thing telling the operator why they can't submit, so it
                  has to stay readable -- the muted pair is already the
                  "disabled" signal. */}
              <Button
                type="button"
                disabled={!isAuthorized || isSubmitting || !canLogCheck}
                onClick={handleLogCheck}
                className="w-full h-12 font-bold tracking-wide uppercase text-sm shadow-md transition-colors disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                {!isAuthorized
                  ? session
                    ? "Banbury account required"
                    : "Login to log check"
                  : isSubmitting
                    ? "Logging..."
                    : !cycleOpen
                      ? "Tap Start to open a check cycle"
                      : !tanksFilled
                        ? "Enter both tank levels"
                        : "Log Check & Start Next"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Recent Checks Card */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold uppercase text-accent-ink tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recent Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {recentChecks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No checks logged yet this shift.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentChecks.map((c) => (
                    <div
                      key={c.banbury_id}
                      className="flex items-center justify-between text-xs bg-muted border border-border rounded-lg px-2.5 py-1.5 gap-2"
                    >
                      <span className="font-bold uppercase text-foreground shrink-0">
                        #{c.check_number}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {c.check_time
                          ? new Intl.DateTimeFormat("en-GB", {
                              timeZone: "Australia/Perth",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }).format(new Date(c.check_time))
                          : "--:--"}
                        {c.run_time_minutes != null && (
                          <span
                            className={
                              isCheckOverrun(c.run_time_minutes)
                                ? "text-destructive font-bold"
                                : "text-muted-foreground/70"
                            }
                          >
                            {" "}
                            ({c.run_time_minutes}m)
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-muted-foreground truncate">
                        R:{c.right_tank_level || "—"} L:
                        {c.left_tank_level || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stale live log confirmation */}
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
            This looks like the start of a new shift, but the live log still
            has <strong>{staleClearConfirm?.count}</strong> check
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
