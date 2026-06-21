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
  // Terminal Mode State (Press #1 or Press #2)
  const [pressNumber, setPressNumber] = useState<string>("1");

  // Collapsible block layout controllers
  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(true);

  // Core component state bindings
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [runTime, setRunTime] = useState<number | "">(27);
  const [loadTime, setLoadTime] = useState<number | "">("");

  // Table Setup Mat Types state tracking (for tables 1, 2, 3, 4)
  const [tableMatTypes, setTableMatTypes] = useState<Record<number, string>>(
    {},
  );

  // Table - Short Molding positions tracker state (stores selected square for tables 1, 2, 3, 4)
  const [selectedTableSquares, setSelectedTableSquares] = useState<
    Record<number, string>
  >({});

  // Bubbles presence multiselect checkboxes state tracking (tableId mapped to sub-positions left/middle/right)
  const [bubbleCheckboxes, setBubbleCheckboxes] = useState<
    Record<number, { left: boolean; middle: boolean; right: boolean }>
  >({
    1: { left: false, middle: false, right: false },
    2: { left: false, middle: false, right: false },
    3: { left: false, middle: false, right: false },
    4: { left: false, middle: false, right: false },
  });

  // Bubble size selections state tracking (tableId mapped to 'Big' | 'Small')
  const [bubbleSizes, setBubbleSizes] = useState<Record<number, string>>({});

  // Controlled bindings for summary preview metrics
  const [operator, setOperator] = useState<string>("");
  const [shift, setShift] = useState<string>("day");

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    const frameId = requestAnimationFrame(() => {
      setCurrentDate(formattedDate);
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  // Automatically calculate difference when startTime or endTime changes
  useEffect(() => {
    if (startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const [endHours, endMinutes] = endTime.split(":").map(Number);

      const startTotalMinutes = startHours * 60 + startMinutes;
      let endTotalMinutes = endHours * 60 + endMinutes;

      if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }

      const diff = endTotalMinutes - startTotalMinutes;
      setLoadTime(diff);
    } else {
      setLoadTime("");
    }
  }, [startTime, endTime]);

  const getSystemTime = () => {
    const now = new Date();
    return now.toTimeString().split(" ")[0].substring(0, 5);
  };

  const handleTimestamp = (type: "start" | "end") => {
    const currentTime = getSystemTime();
    if (type === "start") setStartTime(currentTime);
    if (type === "end") setEndTime(currentTime);
  };

  // Helper handler for updating individual table grids
  const handleSquareSelect = (tableId: number, positionId: string) => {
    setSelectedTableSquares((prev) => ({
      ...prev,
      [tableId]: positionId,
    }));
  };

  // Helper handler for updating table mat setup row selections
  const handleMatSetupSelect = (tableId: number, matType: string) => {
    setTableMatTypes((prev) => ({
      ...prev,
      [tableId]: matType,
    }));
  };

  // Toggle handlers for Bubble positions (Left, Middle, Right)
  const handleBubbleCheckboxToggle = (
    tableId: number,
    position: "left" | "middle" | "right",
    checked: boolean,
  ) => {
    setBubbleCheckboxes((prev) => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        [position]: checked,
      },
    }));
  };

  // Handler for Bubble Size radio selection updates
  const handleBubbleSizeSelect = (tableId: number, size: string) => {
    setBubbleSizes((prev) => ({
      ...prev,
      [tableId]: size,
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto p-3 space-y-4 pb-12">
      {/* Header Info Banner with Press Dropdown Selection */}
      <div className="bg-emerald-800 text-white p-4 rounded-xl shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-wider uppercase whitespace-nowrap">
            Press #{pressNumber} Production
          </h1>
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
        <p className="text-xs text-emerald-200 text-left">
          Mobile Fast-Entry Terminal
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();

          const newCycleEntry = {
            id: Math.random().toString(36).substring(2, 9),
            pressNumber,
            date: currentDate,
            operator,
            shift,
            startTime,
            endTime,
            runTime,
            loadTime, // Save calculated duration difference explicitly
            tableMatTypes,
            selectedTableSquares,
            bubbleCheckboxes,
            bubbleSizes,
            notes:
              (document.getElementById("notes") as HTMLTextAreaElement)
                ?.value || "",
            timestamp: Date.now(),
          };

          const existingRecords = JSON.parse(
            localStorage.getItem("production_cycles") || "[]",
          );
          existingRecords.unshift(newCycleEntry); // Add to the front of the list
          localStorage.setItem(
            "production_cycles",
            JSON.stringify(existingRecords),
          );

          alert(`Saved entry successfully!`);
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
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1 animate-in fade-in duration-300">
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
            <CardContent className="p-4 pt-2 border-t border-neutral-100/60 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Shift Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={currentDate}
                    readOnly
                    className=" bg-neutral-50 cursor-not-allowed text-neutral-500 select-none"
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

              {/* Table Setup (Mat type) Visual Matrix Sub-component */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Table Setup (Mat type)
                </span>
                <div className="space-y-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200/60">
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
                              className={`h-7 px-2 border rounded flex items-center justify-center gap-1.5 text-[11px] font-bold cursor-pointer transition-all select-none ${
                                tableMatTypes[tableId] === type
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                  : "border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              <span>{type}</span>
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
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

        {/* Timestamps & Durations Section */}
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
                <Label htmlFor="loadTime">Load/Unload (min)</Label>
                <Input
                  type="number"
                  id="loadTime"
                  placeholder="Calculated..."
                  className="h-11 bg-neutral-50 font-medium text-neutral-800"
                  value={loadTime}
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tables - Short Molding Visual Grid Selector */}
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
                    {/* Top-Left Square */}
                    <div className="absolute top-0 left-0">
                      <RadioGroupItem
                        value="top-left"
                        id={`t${tableNum}-tl`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-tl`}
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${
                          selectedTableSquares[tableNum] === "top-left"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm font-bold"
                            : "border-neutral-900 hover:bg-neutral-100"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "top-left" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>

                    {/* Top-Right Square */}
                    <div className="absolute top-0 right-0">
                      <RadioGroupItem
                        value="top-right"
                        id={`t${tableNum}-tr`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-tr`}
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${
                          selectedTableSquares[tableNum] === "top-right"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm font-bold"
                            : "border-neutral-900 hover:bg-neutral-100"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "top-right" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>

                    {/* Center Square */}
                    <div className="absolute top-[36px] left-[36px]">
                      <RadioGroupItem
                        value="center"
                        id={`t${tableNum}-cc`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-cc`}
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${
                          selectedTableSquares[tableNum] === "center"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm font-bold"
                            : "border-neutral-900 hover:bg-neutral-100"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "center" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>

                    {/* Bottom-Left Square */}
                    <div className="absolute bottom-0 left-0">
                      <RadioGroupItem
                        value="bottom-left"
                        id={`t${tableNum}-bl`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-bl`}
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${
                          selectedTableSquares[tableNum] === "bottom-left"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm font-bold"
                            : "border-neutral-900 hover:bg-neutral-100"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-current transition-transform ${selectedTableSquares[tableNum] === "bottom-left" ? "scale-100" : "scale-0"}`}
                        />
                      </Label>
                    </div>

                    {/* Bottom-Right Square */}
                    <div className="absolute bottom-0 right-0">
                      <RadioGroupItem
                        value="bottom-right"
                        id={`t${tableNum}-br`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`t${tableNum}-br`}
                        className={`w-[28px] h-[28px] border-2 rounded flex items-center justify-center cursor-pointer transition-all ${
                          selectedTableSquares[tableNum] === "bottom-right"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm font-bold"
                            : "border-neutral-900 hover:bg-neutral-100"
                        }`}
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

        {/* Bubbles Card Section with 3 Checkboxes (L, M, R) */}
        <Card className="shadow-sm border-neutral-200/60">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-700" /> Bubbles
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-3.5">
            {/* Grid Layout Headers */}
            <div className="grid grid-cols-12 gap-2 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-100">
              <div className="col-span-1 text-left">Table</div>
              <div className="col-span-5 grid grid-cols-3 gap-1">
                <span>L</span>
                <span>M</span>
                <span>R</span>
              </div>
              <div className="col-span-6">Size</div>
            </div>

            {/* Matrix entry Rows */}
            {[1, 2, 3, 4].map((tableId) => (
              <div
                key={tableId}
                className="grid grid-cols-12 gap-2 items-center text-center"
              >
                {/* Index label column */}
                <div className="col-span-1 text-left text-sm font-bold text-neutral-700">
                  {tableId}
                </div>

                {/* 3 Checkboxes (Left, Middle, Right) */}
                <div className="col-span-5 grid grid-cols-3 gap-1 justify-items-center">
                  <Checkbox
                    id={`bubble-check-${tableId}-L`}
                    className="w-4 h-4 border-neutral-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    checked={bubbleCheckboxes[tableId].left}
                    onCheckedChange={(checked) =>
                      handleBubbleCheckboxToggle(tableId, "left", !!checked)
                    }
                  />
                  <Checkbox
                    id={`bubble-check-${tableId}-M`}
                    className="w-4 h-4 border-neutral-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    checked={bubbleCheckboxes[tableId].middle}
                    onCheckedChange={(checked) =>
                      handleBubbleCheckboxToggle(tableId, "middle", !!checked)
                    }
                  />
                  <Checkbox
                    id={`bubble-check-${tableId}-R`}
                    className="w-4 h-4 border-neutral-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    checked={bubbleCheckboxes[tableId].right}
                    onCheckedChange={(checked) =>
                      handleBubbleCheckboxToggle(tableId, "right", !!checked)
                    }
                  />
                </div>

                {/* Radio button size selector segment */}
                <div className="col-span-6 flex justify-center">
                  <RadioGroup
                    value={bubbleSizes[tableId] || ""}
                    onValueChange={(val) =>
                      handleBubbleSizeSelect(tableId, val)
                    }
                    className="flex items-center gap-2 w-full justify-between"
                  >
                    {/* Big size option */}
                    <div className="flex-1 flex items-center justify-center">
                      <RadioGroupItem
                        value="Big"
                        id={`size-${tableId}-big`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`size-${tableId}-big`}
                        className={`h-7 w-full border rounded flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all select-none ${
                          bubbleSizes[tableId] === "Big"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        <span>Big</span>
                        <div
                          className={`w-1 h-1 rounded-full ${bubbleSizes[tableId] === "Big" ? "bg-emerald-600" : "bg-neutral-300"}`}
                        />
                      </Label>
                    </div>

                    {/* Small size option */}
                    <div className="flex-1 flex items-center justify-center">
                      <RadioGroupItem
                        value="Small"
                        id={`size-${tableId}-small`}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={`size-${tableId}-small`}
                        className={`h-7 w-full border rounded flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all select-none ${
                          bubbleSizes[tableId] === "Small"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100 text-neutral-600"
                        }`}
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
              placeholder="e.g., Upper right vacuum pad missed placement..."
              className="resize-none min-h-[70px]"
            />
          </CardContent>
        </Card>

        {/* Global Submit Trigger */}
        <Button
          type="submit"
          className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-bold tracking-wide uppercase text-sm shadow-md"
        >
          Submit Cycle Entry
        </Button>
      </form>
    </div>
  );
}
