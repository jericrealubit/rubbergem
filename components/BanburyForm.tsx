"use client";

import { supabase } from "@/lib/supabase";
import { mergeCycles, shiftGroupOf } from "@/lib/banbury-log";
import type { BanburyCheckEntry } from "@/lib/banbury-log";
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
} from "lucide-react";

/** The banbury_production_logs columns read back when resolving a shift's archive row. */
interface BanburyShiftLogRowRef {
  id: number;
  operator_shift: string;
  cycles: unknown;
}

/** The six material/chemical checks on the paper sheet, default-checked since
 *  the sheet is overwhelmingly all-ticked on every row -- the operator only
 *  has to un-tick what wasn't actually checked this pass. */
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

interface RecentCheckRow {
  banbury_id: number;
  check_number: number;
  check_time: string | null;
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
    if (!session) return;
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
  }, [session, operator, shift, product, bagWeight, batchesMade, bagsCount, runTimeHours]);

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
    const { data } = await supabase
      .from("banbury_live_log")
      .select("banbury_id, check_number, check_time, right_tank_level, left_tank_level, notes")
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

  // banbury_production_logs holds exactly ONE row per (date, shift group),
  // same resolution strategy as Press/Bales' findShiftLogRow -- the database
  // is the authority, localStorage is only a per-browser fast path.
  const findShiftLogRow = async (): Promise<BanburyShiftLogRowRef | null> => {
    const { data: sameDateRows, error: lookupError } = await supabase
      .from("banbury_production_logs")
      .select("id, operator_shift, cycles")
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
  // mirrors PressForm/BalesForm's submitCycle, but there is no start/end
  // duration or per-entry output here: a Banbury "cycle" is a single
  // point-in-time check, and the shift's output totals (Batches Made, #
  // Bags, Tonnes, Run Time, Average Output P/H) are scalars snapshotted
  // straight from banbury_shift_config, not derived from the checks array.
  const logCheck = async () => {
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

      const payload = {
        shift_id: 1,
        check_number: nextCheckNumber,
        check_time: nowIso,
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

      const { error } = await supabase.from("banbury_live_log").insert([payload]);
      if (error) throw error;

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

      const aggregatedChecks: BanburyCheckEntry[] = (shiftRows || []).map(
        (r: any) => ({
          cycle_number: r.check_number,
          start_time: fmtPerth(r.check_time),
          crumb_rubber: r.crumb_rubber,
          other_rubbers: r.other_rubbers,
          powdered_chemicals: r.powdered_chemicals,
          rpo: r.rpo,
          sulphur: r.sulphur,
          liquid_chemicals: r.liquid_chemicals,
          right_tank_level: r.right_tank_level,
          left_tank_level: r.left_tank_level,
          notes: r.notes,
        }),
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
            .update(buildLogRow(racedRow.cycles))
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

      // Tank levels are intentionally left as-is (not cleared) so the next
      // check starts from the last reading -- the operator only edits what
      // changed, matching the "optimize input on mobile" goal. Only the
      // freeform notes reset per entry.
      setNotes("");
      localStorage.removeItem("banbury_ws_notes");

      setIsSubmitting(false);
      toast.success(`Check #${nextCheckNumber} logged.`);
      fetchRecentChecks();
    } catch (err) {
      console.error("Error logging check:", err);
      toast.error(
        `Failed to log check: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsSubmitting(false);
    }
  };

  // Checks for leftover live_log rows from an already-closed shift before
  // logging -- mirrors PressForm/BalesForm's stale-clear guard.
  const handleLogCheck = async () => {
    if (!session) return;
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
          setPendingProceed(() => logCheck);
          setIsSubmitting(false);
          return;
        }
      }

      await logCheck();
    } catch (err) {
      console.error("Error checking for leftover shift data:", err);
      toast.error(
        `Could not check for leftover shift data. Log cancelled: ${err instanceof Error ? err.message : String(err)}`,
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
        `Failed to clear leftover live log data. Log cancelled: ${err instanceof Error ? err.message : String(err)}`,
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

          {/* Log Check Card */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold uppercase text-accent-ink tracking-wide flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" /> Log Chemical
                / Tank Check
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {TICK_FIELDS.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => toggleTick(field.key)}
                    className={`h-11 rounded-md border text-[11px] font-bold uppercase tracking-wide transition-colors px-1 ${
                      ticks[field.key]
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {field.label}
                  </button>
                ))}
              </div>

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

              <Button
                type="button"
                disabled={!session || isSubmitting}
                onClick={handleLogCheck}
                className="w-full h-12 font-bold tracking-wide uppercase text-sm shadow-md transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                {!session
                  ? "Login to log check"
                  : isSubmitting
                    ? "Logging..."
                    : "Log Check"}
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
