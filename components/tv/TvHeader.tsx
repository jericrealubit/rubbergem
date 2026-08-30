import type { ShiftHistoryOption } from "./types";

interface ShiftConfig {
  operator: string | null;
  shift_group: string | null;
  press_number: string | null;
}

interface TvHeaderProps {
  shiftConfig: ShiftConfig | null;
  isConnected: boolean;
  historyOptions: ShiftHistoryOption[];
  selectedShiftId: number | "live";
  onSelectShift: (id: number | "live") => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function optionLabel(opt: ShiftHistoryOption): string {
  const d = new Date(`${opt.date}T00:00:00`);
  const weekday = d.toLocaleDateString("en-AU", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  const shiftLabel = opt.shiftGroup === "night" ? "Night" : "Day";
  return `${weekday} ${monthDay} — ${shiftLabel} — ${opt.operator || "—"}`;
}

export default function TvHeader({
  shiftConfig,
  isConnected,
  historyOptions,
  selectedShiftId,
  onSelectShift,
}: TvHeaderProps) {
  const mode: "live" | "history" = selectedShiftId === "live" ? "live" : "history";

  const monthGroups = new Map<string, ShiftHistoryOption[]>();
  historyOptions.forEach((opt) => {
    const [year, month] = opt.date.split("-");
    const label = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
    if (!monthGroups.has(label)) monthGroups.set(label, []);
    monthGroups.get(label)!.push(opt);
  });

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-5 rounded-xl bg-card border border-border">
      <h1 className="text-xl font-black uppercase tracking-widest text-foreground">
        Press Floor{mode === "history" ? " — History" : " — Live Production"}
      </h1>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Operator
          </p>
          <p className="text-sm font-bold text-foreground">
            {shiftConfig?.operator || "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Shift
          </p>
          <p className="text-sm font-bold text-foreground capitalize">
            {shiftConfig?.shift_group || "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Press
          </p>
          <p className="text-sm font-bold text-foreground">
            {shiftConfig?.press_number
              ? `#${shiftConfig.press_number}`
              : "—"}
          </p>
        </div>

        <select
          value={String(selectedShiftId)}
          onChange={(e) =>
            onSelectShift(e.target.value === "live" ? "live" : Number(e.target.value))
          }
          className="h-8 pl-2 pr-1 text-xs font-bold rounded-md bg-muted border border-border text-foreground uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-primary"
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
