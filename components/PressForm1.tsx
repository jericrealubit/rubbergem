"use client";

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
} from "lucide-react";

export default function ProductionForm() {
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

  // The End Time button should be disabled if startTime is not yet set
  const isEndTimeDisabled = !startTime;

  const [runTime, setRunTime] = useState<number | "">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ws_run_time");
      return saved !== null ? (saved === "" ? "" : Number(saved)) : 27;
    }
    return 27;
  });

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
      const savedMats = localStorage.getItem("shift_mat_types");
      setTableMatTypes(savedMats ? JSON.parse(savedMats) : {});

      // Synchronize in case of external clearing events
      setStartTime(localStorage.getItem("ws_start_time") || "");
      setEndTime(localStorage.getItem("ws_end_time") || "");
      const rTime = localStorage.getItem("ws_run_time");
      setRunTime(rTime !== null ? (rTime === "" ? "" : Number(rTime)) : 27);
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
    localStorage.setItem("shift_mat_types", JSON.stringify(tableMatTypes));
  }, [tableMatTypes]);
  useEffect(() => {
    localStorage.setItem("ws_start_time", startTime);
  }, [startTime]);
  useEffect(() => {
    localStorage.setItem("ws_end_time", endTime);
  }, [endTime]);
  useEffect(() => {
    localStorage.setItem("ws_run_time", String(runTime));
  }, [runTime]);
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
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setCurrentDate(`${year}-${month}-${day}`);
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

  return (
    <div className="w-full max-w-md mx-auto p-3 space-y-4 pb-12">
      {/* Header Info Banner with Press Dropdown Selection */}
      <div className="bg-emerald-800 text-white p-4 rounded-xl shadow-sm space-y-3">
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
        onSubmit={(e) => {
          e.preventDefault();

          // 1. Package the current workspace data into a log entry
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

          // 2. Append to the production log history in localStorage
          const existingRecords = JSON.parse(
            localStorage.getItem("production_cycles") || "[]",
          );
          existingRecords.unshift(newCycleEntry);
          localStorage.setItem(
            "production_cycles",
            JSON.stringify(existingRecords),
          );

          // =========================================================
          // 3. RESET SPECIFIC ACTIVE WORKSPACE STATES ON SUBMIT
          // =========================================================
          setStartTime("");
          setEndTime("");
          setRunTime(27); // Reset back to factory default standard run time
          setLoadTime("");
          setSelectedTableSquares({});
          setBubbleCheckboxes({
            1: { left: false, middle: false, right: false },
            2: { left: false, middle: false, right: false },
            3: { left: false, middle: false, right: false },
            4: { left: false, middle: false, right: false },
          });
          setBubbleSizes({});
          setNotes("");

          // =========================================================
          // 4. CLEAR WRITTEN CACHE FROM LOCALSTORAGE WORKSPACE KEYS
          // =========================================================
          localStorage.removeItem("ws_start_time");
          localStorage.removeItem("ws_end_time");
          localStorage.setItem("ws_run_time", "27");
          localStorage.removeItem("ws_load_time");
          localStorage.removeItem("ws_selected_squares");
          localStorage.removeItem("ws_bubble_checkboxes");
          localStorage.removeItem("ws_bubble_sizes");
          localStorage.removeItem("ws_notes");

          // Cleanly close the shift settings display pane accordian if preferred
          setIsShiftOpen(false);

          alert(`Saved entry successfully! Form workspace cleared.`);
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
                    {shift === "day" ? "Day Shift" : "Night Shift"} •{" "}
                    {currentDate || "---"}
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
              <div className="grid grid-cols-3 gap-3">
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
              </div>

              {/* Table Setup */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Table Setup (Mat type)
                </span>
                <div className="min-w-[340px] flex flex-col gap-3">
                  {[1, 2, 3, 4].map((tableId) => (
                    <div key={tableId} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-neutral-600 w-4">
                        {tableId}
                      </span>
                      <RadioGroup
                        value={tableMatTypes[tableId] || ""}
                        onValueChange={(val) =>
                          handleMatSetupSelect(tableId, val)
                        }
                        className="flex flex-1 items-center justify-between"
                      >
                        {["DF", "DD", "CF", "CD", "SG"].map((type) => (
                          <div key={type} className="flex items-center gap-1">
                            <RadioGroupItem
                              value={type}
                              id={`msetup-${tableId}-${type}`}
                              className="sr-only"
                            />
                            <Label
                              htmlFor={`msetup-${tableId}-${type}`}
                              className={`h-7 px-2 border rounded flex items-center justify-center gap-1.5 text-[11px] font-bold cursor-pointer transition-all select-none ${tableMatTypes[tableId] === type ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"}`}
                            >
                              <span>{type}</span>
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${tableMatTypes[tableId] === type ? "bg-white" : "bg-neutral-300"}`}
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
                <Label>Start Time</Label>
                <Button
                  type="button"
                  variant={startTime ? "secondary" : "outline"}
                  className={`w-full h-12 font-bold tracking-wide border-dashed border-2 ${!startTime && "border-emerald-600 bg-emerald-50/50 text-emerald-800"}`}
                  onClick={() => handleTimestamp("start")}
                >
                  {startTime || "TAP TO START"}
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Button
                  type="button"
                  disabled={isEndTimeDisabled}
                  variant={endTime ? "secondary" : "outline"}
                  className={`w-full h-12 font-bold tracking-wide border-dashed border-2 ${!endTime && "border-emerald-600 bg-emerald-50/50 text-emerald-800"}`}
                  onClick={() => handleTimestamp("end")}
                >
                  {endTime || "TAP TO END"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="runTime">Run Time (min)</Label>
                <Input
                  type="number"
                  id="runTime"
                  placeholder="e.g. 27"
                  className="h-11"
                  value={runTime}
                  onChange={(e) =>
                    setRunTime(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="loadTime"
                  className="flex items-center justify-between"
                >
                  <span>Load/Unload</span>
                  {loadTime === "" ? (
                    <span className="text-[10px]  text-neutral-400">
                      REQUIRED
                    </span>
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
                  placeholder="Calculated..."
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
            </div>
          </CardContent>
        </Card>

        {/* Tables - Short Molding */}
        <Card className="shadow-sm border-neutral-200/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Tables -
              Short Molding
            </CardTitle>
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
                    {/* Top Left */}
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
                    {/* Top Right */}
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
                    {/* Center */}
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
                    {/* Bottom Left */}
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
                    {/* Bottom Right */}
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

        {/* Bubbles Checkbox Layout Header & Matrix */}
        <Card className="shadow-sm border-neutral-200/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-700" /> Bubbles
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3.5">
            <div className="grid grid-cols-12 gap-2 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-100">
              <div className="col-span-1 text-left">Table</div>
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
          disabled={loadTime === "" || Number(loadTime) < 1}
          className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed font-bold tracking-wide uppercase text-sm shadow-md transition-colors"
        >
          {loadTime === ""
            ? "Enter Timestamps to Submit"
            : Number(loadTime) < 1
              ? "Load Time Must Be ≥ 1 Min"
              : "Submit Cycle Entry"}
        </Button>
      </form>
    </div>
  );
}
