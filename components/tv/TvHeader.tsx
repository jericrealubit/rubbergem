"use client";

import { TV_LINES, TV_LINE_TITLES, type ShiftPickerOption, type TvLine } from "./types";

/**
 * One line-appropriate fact in the header strip — Press shows Operator /
 * Shift / Press, Bales swaps Press for Mesh, Banbury for Product. Panels
 * supply their own list rather than the header knowing each line's schema.
 */
export interface HeaderMeta {
  label: string;
  value: string;
}

interface TvHeaderProps {
  line: TvLine;
  onSelectLine: (line: TvLine) => void;
  meta: HeaderMeta[];
  isConnected: boolean;
  historyOptions: ShiftPickerOption[];
  selectedShiftId: number | "live";
  onSelectShift: (id: number | "live") => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function optionLabel(opt: ShiftPickerOption): string {
  const d = new Date(`${opt.date}T00:00:00`);
  const weekday = d.toLocaleDateString("en-AU", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  const shiftLabel = opt.shiftGroup === "night" ? "Night" : "Day";
  return `${weekday} ${monthDay} — ${shiftLabel} — ${opt.operator || "—"}`;
}

export default function TvHeader({
  line,
  onSelectLine,
  meta,
  isConnected,
  historyOptions,
  selectedShiftId,
  onSelectShift,
}: TvHeaderProps) {
  const mode: "live" | "history" = selectedShiftId === "live" ? "live" : "history";

  const monthGroups = new Map<string, ShiftPickerOption[]>();
  historyOptions.forEach((opt) => {
    const [year, month] = opt.date.split("-");
    const label = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
    if (!monthGroups.has(label)) monthGroups.set(label, []);
    monthGroups.get(label)!.push(opt);
  });

  return (
    <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-5 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-5 min-w-0">
        <h1 className="text-xl font-black uppercase tracking-widest text-foreground whitespace-nowrap">
          {TV_LINE_TITLES[line]}
          {mode === "history" ? " — History" : " — Live Production"}
        </h1>

        {/* Line switcher — the wallboard shows one line at a time. */}
        <div
          role="group"
          aria-label="Production line"
          className="flex items-center gap-1 p-1 rounded-lg bg-muted"
        >
          {TV_LINES.map((option) => {
            const active = option.id === line;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectLine(option.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {meta.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <p className="text-sm font-bold text-foreground capitalize">
              {item.value || "—"}
            </p>
          </div>
        ))}

        <label className="sr-only" htmlFor="tv-shift-picker">
          Shift to display
        </label>
        <select
          id="tv-shift-picker"
          value={String(selectedShiftId)}
          onChange={(e) =>
            onSelectShift(e.target.value === "live" ? "live" : Number(e.target.value))
          }
          className="h-8 pl-2 pr-1 text-xs font-bold rounded-md bg-muted border border-border text-foreground uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="live">Live</option>
          {Array.from(monthGroups.entries()).map(([label, opts]) => (
            <optgroup key={label} label={label}>
              {opts.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {optionLabel(opt)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center gap-2 pl-4 border-l border-border">
          {mode === "history" ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-warning">
                Viewing History
              </span>
            </>
          ) : (
            <>
              <span
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  isConnected ? "bg-success" : "bg-destructive"
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isConnected ? "Live" : "Reconnecting"}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
