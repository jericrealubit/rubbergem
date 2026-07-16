"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings2,
  RotateCcw,
  Loader2,
} from "lucide-react";

export default function ProductionForm({
  session,
  onStartTimer,
}: {
  session: any;
  onStartTimer?: (minutes: number) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      return savedState !== null ? savedState === "true" : true;
    }
    return true;
  });

  // Collapsible state for Bubbles section - false by default
  const [isBubblesOpen, setIsBubblesOpen] = useState<boolean>(false);

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

  const [endTime, setEndTime] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ws_end_time") || "";
    }
    return "";
  });

  // Manual input switches for lunch/break runtime overrides
  const [isManualStart, setIsManualStart] = useState<boolean>(false);
  const [isManualEnd, setIsManualEnd] = useState<boolean>(false);

  // The End Time button should be disabled if startTime is not yet set
  const isEndTimeDisabled = !startTime;

  const [loadTime, setLoadTime] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ws_load_time");
      return saved !== null ? (saved === "" ? "" : Number(saved)) : "";
    }
    return "";
  });

  const [selectedTableSquares, setSelectedTableSquares] = useState<
    Record<number, string>
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ws_selected_squares");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [bubbleCheckboxes, setBubbleCheckboxes] = useState<
    Record<number, { left: boolean; middle: boolean; right: boolean }>
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ws_bubble_checkboxes");
      return saved
        ? JSON.parse(saved)
        : {
            1: { left: false, middle: false, right: false },
            2: { left: false, middle: false, right: false },
            3: { left: false, middle: false, right: false },
            4: { left: false, middle: false, right: false },
          };
    }
    return {
      1: { left: false, middle: false, right: false },
      2: { left: false, middle: false, right: false },
      3: { left: false, middle: false, right: false },
      4: { left: false, middle: false, right: false },
    };
  });

  const [bubbleSizes, setBubbleSizes] = useState<Record<number, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ws_bubble_sizes");
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
      setIsShiftOpen(savedState !== null ? savedState === "true" : true);
      setOperator(localStorage.getItem("shift_operator") || "");
      setShift(localStorage.getItem("shift_group") || "day");

      const rTime = localStorage.getItem("shift_run_time");
      setRunTime(rTime !== null ? (rTime === "" ? "" : Number(rTime)) : "");

      const savedMats = localStorage.getItem("shift_mat_types");
      setTableMatTypes(savedMats ? JSON.parse(savedMats) : {});

      // Synchronize active workspace components
      setStartTime(localStorage.getItem("ws_start_time") || "");
      setEndTime(localStorage.getItem("ws_end_time") || "");
      const lTime = localStorage.getItem("ws_load_time");
      setLoadTime(lTime !== null ? (lTime === "" ? "" : Number(lTime)) : "");
      const savedSquares = localStorage.getItem("ws_selected_squares");
      setSelectedTableSquares(savedSquares ? JSON.parse(savedSquares) : {});
      const savedBubbles = localStorage.getItem("ws_bubble_checkboxes");
      setBubbleCheckboxes(
        savedBubbles
          ? JSON.parse(savedBubbles)
          : {
              1: { left: false, middle: false, right: false },
              2: { left: false, middle: false, right: false },
              3: { left: false, middle: false, right: false },
              4: { left: false, middle: false, right: false },
            },
      );
      const savedSizes = localStorage.getItem("ws_bubble_sizes");
      setBubbleSizes(savedSizes ? JSON.parse(savedSizes) : {});
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
  useEffect(() => {
    localStorage.setItem("ws_start_time", startTime);
  }, [startTime]);
  useEffect(() => {
    localStorage.setItem("ws_end_time", endTime);
  }, [endTime]);
  useEffect(() => {
    localStorage.setItem("ws_load_time", String(loadTime));
  }, [loadTime]);
  useEffect(() => {
    localStorage.setItem(
      "ws_selected_squares",
      JSON.stringify(selectedTableSquares),
    );
  }, [selectedTableSquares]);
  useEffect(() => {
    localStorage.setItem(
      "ws_bubble_checkboxes",
      JSON.stringify(bubbleCheckboxes),
    );
  }, [bubbleCheckboxes]);
  useEffect(() => {
    localStorage.setItem("ws_bubble_sizes", JSON.stringify(bubbleSizes));
  }, [bubbleSizes]);
  useEffect(() => {
    localStorage.setItem("ws_notes", notes);
  }, [notes]);

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Perth",
    }).format(new Date());

    setPerthDate(formatted);
  }, []);

  // Automated midnight-crossover duration calculator
  useEffect(() => {
    if (startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const [endHours, endMinutes] = endTime.split(":").map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      let endTotalMinutes = endHours * 60 + endMinutes;

      if (endTotalMinutes < startTotalMinutes) endTotalMinutes += 24 * 60;
      setLoadTime(endTotalMinutes - startTotalMinutes);
    } else {
      setLoadTime("");
    }
  }, [startTime, endTime]);

  const handleTimestamp = (type: "start" | "end") => {
    const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
    if (type === "start") setStartTime(currentTime);
    if (type === "end") setEndTime(currentTime);
  };

  const handleSquareSelect = (tableId: number, positionId: string) => {
    setSelectedTableSquares((prev) => ({ ...prev, [tableId]: positionId }));
  };

  const handleMatSetupSelect = (tableId: number, matType: string) => {
    setTableMatTypes((prev) => ({ ...prev, [tableId]: matType }));
  };

  const handleBubbleCheckboxToggle = (
    tableId: number,
    position: "left" | "middle" | "right",
    checked: boolean,
  ) => {
    setBubbleCheckboxes((prev) => ({
      ...prev,
      [tableId]: { ...prev[tableId], [position]: checked },
    }));
  };

  const handleBubbleSizeSelect = (tableId: number, size: string) => {
    setBubbleSizes((prev) => ({ ...prev, [tableId]: size }));
  };

  const handleResetShortMolding = () => {
    setSelectedTableSquares({});
  };

  const handleResetBubbles = () => {
    setBubbleCheckboxes({
      1: { left: false, middle: false, right: false },
      2: { left: false, middle: false, right: false },
      3: { left: false, middle: false, right: false },
      4: { left: false, middle: false, right: false },
    });
    setBubbleSizes({});
  };

  return (
    <div className="w-full max-w-md mx-auto p-3 space-y-4 pb-12">
      {/* Header Info Banner - Added "relative" so absolute clock floats properly */}
      <div className="relative bg-emerald-800 text-white p-4 rounded-xl shadow-sm space-y-3">
        {/* Row 1: Full-width Title */}
        <div>
          <h1 className="text-xl font-bold tracking-wider uppercase whitespace-nowrap">
            Press #{pressNumber} Production
          </h1>
        </div>

        {/* Row 2: 2-Column Split */}
        <div className="grid grid-cols-2 items-center gap-4">
          {/* Column 1: Subtitle */}
          <p className="text-xs text-emerald-200 text-left leading-none">
            Mobile Fast-Entry Terminal
          </p>

          {/* Column 2: Select Dropdown (aligned right) */}
          <div className="flex justify-end">
            <Select value={pressNumber} onValueChange={setPressNumber}>
              <SelectTrigger className="w-[120px] h-9 bg-emerald-900/60 border-emerald-700/50 text-white font-medium focus:ring-emerald-500">
                <SelectValue placeholder="Select Press" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Press #1</SelectItem>
                <SelectItem value="2">Press #2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setIsSubmitting(true);

          try {
            const { data: latestEntry, error: fetchError } = await supabase
              .from("live_log")
              .select("cycle_number")
              .order("cycle_number", { ascending: false })
              .limit(1)
              .single();

            const nextCycleNumber = (latestEntry?.cycle_number || 0) + 1;

            const startTimestamp = new Date(
              `${currentDate}T${startTime}:00+08:00`,
            ).toISOString();

            const endTimestamp = new Date(
              `${currentDate}T${endTime}:00+08:00`,
            ).toISOString();

            const formattedYieldJson: Record<string, any> = {};

            [1, 2, 3, 4].forEach((tableId) => {
              const matType = tableMatTypes[tableId] || "Unknown";
              const shortMoldPos = selectedTableSquares[tableId];

              const hasShortMold = !!shortMoldPos;
              const hasBubble =
                bubbleCheckboxes[tableId]?.left ||
                bubbleCheckboxes[tableId]?.middle ||
                bubbleCheckboxes[tableId]?.right;

              const isReject = hasShortMold || hasBubble;

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
              load_duration_seconds: Number(loadTime) * 60,
              short_mold_json: formattedYieldJson,
              bubble_json: { checks: bubbleCheckboxes, sizes: bubbleSizes },
              notes: notes,
              updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from("live_log").insert([payload]);
            if (error) throw error;

            const newCycleEntry = {
              id: Math.random().toString(36).substring(2, 9),
              pressNumber,
              date: currentDate,
              operator,
              shift,
              startTime,
              endTime,
              runTime,
              loadTime,
              tableMatTypes,
              selectedTableSquares,
              bubbleCheckboxes,
              bubbleSizes,
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

            setStartTime("");
            setEndTime("");
            setLoadTime("");
            setIsManualStart(false);
            setIsManualEnd(false);
            setSelectedTableSquares({});
            setBubbleCheckboxes({
              1: { left: false, middle: false, right: false },
              2: { left: false, middle: false, right: false },
              3: { left: false, middle: false, right: false },
              4: { left: false, middle: false, right: false },
            });
            setBubbleSizes({});
            setNotes("");

            localStorage.removeItem("ws_start_time");
            localStorage.removeItem("ws_end_time");
            localStorage.removeItem("ws_load_time");
            localStorage.removeItem("ws_selected_squares");
            localStorage.removeItem("ws_bubble_checkboxes");
            localStorage.removeItem("ws_bubble_sizes");
            localStorage.removeItem("ws_notes");

            localStorage.setItem("shift_panel_open", "false");
            setIsShiftOpen(false);
            setIsBubblesOpen(false);
            setIsSubmitting(false);

            alert(`Saved entry successfully! Form workspace cleared.`);
            const minutes = parseInt(String(runTime), 10);
            if (!isNaN(minutes) && minutes > 0 && onStartTimer) {
              onStartTimer(minutes);
            }
          } catch (err) {
            console.error("Error submitting:", err);
            alert("Failed to submit entry.");
            setIsSubmitting(false);
          }
        }}
        className="space-y-4"
      >
        {/* Collapsible Shift / Metadata Card */}
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
                    {shift === "day" ? "Day" : "Night"} • Run:{" "}
                    {runTime || "---"}m • {currentDate || "---"}
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
                  <Label htmlFor="date">Shift Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={currentDate}
                    readOnly
                    className="bg-neutral-50 cursor-not-allowed text-neutral-500 select-none"
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
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Table Setup (Mat type)
                </span>
                <div className="w-full max-w-[440px] flex flex-col gap-2.5">
                  {[1, 2, 3, 4].map((tableId) => (
                    <div
                      key={tableId}
                      className="flex items-center gap-1.5 w-full"
                    >
                      <span className="text-xs font-bold text-neutral-500 w-3 shrink-0 text-left">
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
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                  : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              <span className="font-mono tracking-tighter">
                                {type}
                              </span>
                              <div
                                className={`w-1 h-1 rounded-full shrink-0 ${
                                  tableMatTypes[tableId] === type
                                    ? "bg-white"
                                    : "bg-neutral-300"
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
            </CardContent>
          )}
        </Card>

        {/* Timestamps & Durations */}
        <Card className="shadow-sm border-neutral-200/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" /> Timestamps &
              Durations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Start Time</Label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!startTime && !isManualStart) {
                        const currentTime = new Date()
                          .toTimeString()
                          .split(" ")[0]
                          .substring(0, 5);
                        setStartTime(currentTime);
                      }
                      setIsManualStart(!isManualStart);
                    }}
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
                ) : (
                  <Button
                    type="button"
                    variant={startTime ? "secondary" : "outline"}
                    className={`w-full h-12 font-bold tracking-wide border-dashed border-2 ${!startTime && "border-emerald-600 bg-emerald-50/50 text-emerald-800"}`}
                    onClick={() => handleTimestamp("start")}
                  >
                    {startTime || "TAP TO START"}
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>End Time</Label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!endTime && !isManualEnd) {
                        const currentTime = new Date()
                          .toTimeString()
                          .split(" ")[0]
                          .substring(0, 5);
                        setEndTime(currentTime);
                      }
                      setIsManualEnd(!isManualEnd);
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors uppercase tracking-wider"
                    disabled={isEndTimeDisabled}
                  >
                    {isManualEnd ? "● Tap Mode" : "✎ Manual"}
                  </button>
                </div>
                {isManualEnd ? (
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-12 text-center font-mono font-bold text-sm bg-emerald-50/10 border-emerald-200 focus-visible:ring-emerald-600"
                    disabled={isEndTimeDisabled}
                  />
                ) : (
                  <Button
                    type="button"
                    disabled={isEndTimeDisabled}
                    variant={endTime ? "secondary" : "outline"}
                    className={`w-full h-12 font-bold tracking-wide border-dashed border-2 ${!endTime && "border-emerald-600 bg-emerald-50/50 text-emerald-800"}`}
                    onClick={() => handleTimestamp("end")}
                  >
                    {endTime || "TAP TO END"}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="loadTime"
                className="flex items-center justify-between"
              >
                <span>Load/Unload Duration</span>
                {loadTime === "" ? (
                  <span className="text-[10px] text-neutral-400">REQUIRED</span>
                ) : Number(loadTime) < 1 ? (
                  <span className="text-[10px] font-bold text-destructive animate-pulse">
                    MIN 1 MIN REQUIRED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600">
                    VALID
                  </span>
                )}
              </Label>
              <Input
                type="number"
                id="loadTime"
                placeholder="Calculated automatically..."
                className={`h-11 font-medium transition-colors ${
                  loadTime === ""
                    ? "bg-neutral-50 border-neutral-200 text-neutral-400"
                    : Number(loadTime) < 1
                      ? "bg-red-50 border-red-300 text-red-900 focus-visible:ring-red-500"
                      : "bg-emerald-50/30 border-emerald-200 text-neutral-800"
                }`}
                value={loadTime}
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* Tables - Short Molding */}
        <Card className="shadow-sm border-neutral-200/60">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Tables -
              Short Molding
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetShortMolding}
              className="h-7 px-2 text-[11px] font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 border-neutral-200 hover:border-red-200 transition-colors gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Matrix
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8">
              {[1, 2, 3, 4].map((tableNum) => (
                <div key={tableNum} className="flex items-start gap-2">
                  <span className="text-2xl font-bold text-neutral-800 pt-1 select-none">
                    {tableNum}
                  </span>
                  <RadioGroup
                    value={selectedTableSquares[tableNum] || ""}
                    onValueChange={(val) => handleSquareSelect(tableNum, val)}
                    className="grid grid-cols-3 gap-1.5 relative w-[100px] h-[100px]"
                  >
                    <div className="absolute top-0 left-0">
                      <RadioGroupItem
                        value="top-left"
                        id={`t${tableNum}-tl`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-tl`}
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "top-left" ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" : "border-neutral-900 hover:bg-neutral-100"}`}
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
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "top-right" ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" : "border-neutral-900 hover:bg-neutral-100"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "top-right" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>
                    <div className="absolute top-[36px] left-[36px]">
                      <RadioGroupItem
                        value="center"
                        id={`t${tableNum}-cc`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-cc`}
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "center" ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" : "border-neutral-900 hover:bg-neutral-100"}`}
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
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "bottom-left" ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" : "border-neutral-900 hover:bg-neutral-100"}`}
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
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${selectedTableSquares[tableNum] === "bottom-right" ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" : "border-neutral-900 hover:bg-neutral-100"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "bottom-right" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Bubbles Card */}
        <Card className="shadow-sm border-neutral-200/60 overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => setIsBubblesOpen(!isBubblesOpen)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-50/50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-sm font-semibold uppercase text-emerald-900 tracking-wide block">
                  Bubbles Matrix
                </span>
                {!isBubblesOpen && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Click to view layout options & defects
                  </p>
                )}
              </div>
            </div>

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetBubbles}
                className="h-7 px-2 text-[11px] font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 border-neutral-200 hover:border-red-200 transition-colors gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Grid
              </Button>
              {isBubblesOpen ? (
                <ChevronUp className="w-5 h-5 text-neutral-400 shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0" />
              )}
            </div>
          </button>

          {isBubblesOpen && (
            <CardContent className="p-4 pt-2 border-t border-neutral-100 space-y-3.5">
              <div className="grid grid-cols-12 gap-2 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-100">
                <div className="col-span-1 text-left">#</div>
                <div className="col-span-5 grid grid-cols-3 gap-1">
                  <span>L</span>
                  <span>M</span>
                  <span>R</span>
                </div>
                <div className="col-span-6">Size</div>
              </div>
              {[1, 2, 3, 4].map((tableId) => (
                <div
                  key={tableId}
                  className="grid grid-cols-12 gap-2 items-center text-center"
                >
                  <div className="col-span-1 text-left text-sm font-bold text-neutral-700">
                    {tableId}
                  </div>
                  <div className="col-span-5 grid grid-cols-3 gap-1 justify-items-center">
                    <Checkbox
                      id={`bubble-check-${tableId}-L`}
                      className="w-4 h-4 border-neutral-400 data-[state=checked]:bg-emerald-600"
                      checked={bubbleCheckboxes[tableId].left}
                      onCheckedChange={(c) =>
                        handleBubbleCheckboxToggle(tableId, "left", !!c)
                      }
                    />
                    <Checkbox
                      id={`bubble-check-${tableId}-M`}
                      className="w-4 h-4 border-neutral-400 data-[state=checked]:bg-emerald-600"
                      checked={bubbleCheckboxes[tableId].middle}
                      onCheckedChange={(c) =>
                        handleBubbleCheckboxToggle(tableId, "middle", !!c)
                      }
                    />
                    <Checkbox
                      id={`bubble-check-${tableId}-R`}
                      className="w-4 h-4 border-neutral-400 data-[state=checked]:bg-emerald-600"
                      checked={bubbleCheckboxes[tableId].right}
                      onCheckedChange={(c) =>
                        handleBubbleCheckboxToggle(tableId, "right", !!c)
                      }
                    />
                  </div>
                  <div className="col-span-6 flex justify-center">
                    <RadioGroup
                      value={bubbleSizes[tableId] || ""}
                      onValueChange={(val) =>
                        handleBubbleSizeSelect(tableId, val)
                      }
                      className="flex items-center gap-2 w-full justify-between"
                    >
                      <div className="flex-1 flex items-center justify-center">
                        <RadioGroupItem
                          value="Big"
                          id={`size-${tableId}-big`}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={`size-${tableId}-big`}
                          className={`h-7 w-full border rounded flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all ${bubbleSizes[tableId] === "Big" ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-neutral-50/50 text-neutral-600"}`}
                        >
                          <span>Big</span>
                          <div
                            className={`w-1 h-1 rounded-full ${bubbleSizes[tableId] === "Big" ? "bg-emerald-600" : "bg-neutral-300"}`}
                          />
                        </Label>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <RadioGroupItem
                          value="Small"
                          id={`size-${tableId}-small`}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={`size-${tableId}-small`}
                          className={`h-7 w-full border rounded flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all ${bubbleSizes[tableId] === "Small" ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-neutral-50/50 text-neutral-600"}`}
                        >
                          <span>Small</span>
                          <div
                            className={`w-1 h-1 rounded-full ${bubbleSizes[tableId] === "Small" ? "bg-emerald-600" : "bg-neutral-300"}`}
                          />
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Freeform Machine Notes */}
        <Card className="shadow-sm border-neutral-200/60">
          <CardContent className="p-4 space-y-1.5">
            <Label htmlFor="notes">Mechanical Faults / Cycle Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Upper right vacuum pad missed placement..."
              className="resize-none min-h-[70px]"
            />
          </CardContent>
        </Card>

        {/* Global Submit Trigger */}
        <Button
          type="submit"
          disabled={session ? loadTime === "" || Number(loadTime) < 1 : true}
          className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed font-bold tracking-wide uppercase text-sm shadow-md transition-colors"
        >
          {isSubmitting && <Loader2 className="animate-spin" size={20} />}
          {session
            ? loadTime === ""
              ? "Enter Timestamps to Submit"
              : Number(loadTime) < 1
                ? "Load Time Must Be ≥ 1 Min"
                : "Submit Cycle Entry"
            : "Login to submit cycle"}
        </Button>
      </form>
    </div>
  );
}
