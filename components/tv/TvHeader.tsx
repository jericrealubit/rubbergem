interface ShiftConfig {
  operator: string | null;
  shift_group: string | null;
  press_number: string | null;
}

interface TvHeaderProps {
  shiftConfig: ShiftConfig | null;
  isConnected: boolean;
}

export default function TvHeader({ shiftConfig, isConnected }: TvHeaderProps) {
  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-5 rounded-xl bg-neutral-900 border border-neutral-800">
      <h1 className="text-xl font-black uppercase tracking-widest text-white">
        Live Production — Press Floor
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

        <div className="flex items-center gap-2 pl-4 border-l border-neutral-800">
          <span
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              isConnected ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {isConnected ? "Live" : "Reconnecting"}
          </span>
        </div>
      </div>
    </header>
  );
}
