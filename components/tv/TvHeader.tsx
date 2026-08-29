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
    <header className="h-16 shrink-0 flex items-center justify-between px-5 rounded-xl bg-neutral-900 border border-neutral-800">
      <h1 className="text-xl font-black uppercase tracking-widest text-white">
        Press Floor{mode === "history" ? " — History" : " — Live Production"}
      </h1>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Operator
          </p>
          <p className="text-sm font-bold text-neutral-100">
            {shiftConfig?.operator || "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Shift
          </p>
          <p className="text-sm font-bold text-neutral-100 capitalize">
            {shiftConfig?.shift_group || "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Press
          </p>
          <p className="text-sm font-bold text-neutral-100">
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
          className="h-8 pl-2 pr-1 text-xs font-bold rounded-md bg-neutral-800 border border-neutral-700 text-neutral-100 uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-emerald-600"
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

        <div className="flex items-center gap-2 pl-4 border-l border-neutral-800">
          {mode === "history" ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Viewing History
              </span>
            </>
          ) : (
            <>
              <span
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {isConnected ? "Live" : "Reconnecting"}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
