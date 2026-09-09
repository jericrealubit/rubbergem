"use client";

/**
 * The wallboard's "what happened, entry by entry" strip, shared by all three
 * lines: Press draws four rows (one per table, each cell a mat), Banbury six
 * (one per material check), Bales one (each cell a cycle).
 *
 * Cells run left to right in shift order and flex to fill the row, capped so
 * a handful of entries early in a shift don't balloon into slabs. Because
 * they shrink rather than overflow, a long shift stays whole on screen
 * instead of clipping its oldest entries off the edge.
 *
 * Tones are status colours (good / bad / idle), never series identity, and
 * the legend spells each one out so state is never carried by colour alone.
 */

export type SequenceTone = "good" | "bad" | "idle";

export interface SequenceCell {
  key: string | number;
  tone: SequenceTone;
  /** Optional in-cell figure (bales made, minutes run). Needs a wider cell. */
  label?: string;
  /** Tooltip / screen-reader text for this cell. */
  title?: string;
}

export interface SequenceRow {
  label: string;
  /** Optional running tally shown beside the row label (e.g. misses so far). */
  badge?: string;
  cells: SequenceCell[];
}

const SOLID_TONE: Record<SequenceTone, string> = {
  good: "bg-success",
  bad: "bg-destructive",
  idle: "bg-muted",
};

// A labelled cell tints the same status hue instead of filling it, so
// `text-foreground` keeps its contrast against the tile in every theme —
// there is no `--destructive-foreground` token to pair with a solid fill.
const TINTED_TONE: Record<SequenceTone, string> = {
  good: "bg-success/20 border border-success/50",
  bad: "bg-destructive/20 border border-destructive/60",
  idle: "bg-muted border border-border",
};

interface TvSequenceGridProps {
  title: string;
  rows: SequenceRow[];
  legend: { tone: SequenceTone; label: string }[];
  /** Sizing for one cell — widen the cap when cells carry a figure. */
  cellClassName?: string;
  /** Row-label column width; widen it for long labels. */
  labelWidth?: string;
  /** Shown in place of the strip when the shift has no entries yet. */
  emptyMessage?: string;
  className?: string;
}

export default function TvSequenceGrid({
  title,
  rows,
  legend,
  cellClassName = "flex-1 min-w-[6px] max-w-[28px]",
  labelWidth = "w-14",
  emptyMessage = "No cycles logged yet",
  className = "flex-[2]",
}: TvSequenceGridProps) {
  const isEmpty = rows.every((row) => row.cells.length === 0);

  return (
    <div
      className={`${className} min-h-0 bg-card rounded-xl border border-border p-3 flex flex-col gap-2`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-muted-foreground">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${SOLID_TONE[item.tone]}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          {rows.map((row) => (
            <div key={row.label} className="flex-1 flex items-center gap-2 min-h-0">
              <span
                className={`${labelWidth} shrink-0 flex items-baseline justify-between gap-1 text-[11px] font-bold text-muted-foreground`}
              >
                <span className="truncate">{row.label}</span>
                {row.badge && (
                  <span className="font-mono text-foreground">{row.badge}</span>
                )}
              </span>
              <div className="flex-1 h-full flex gap-1 overflow-hidden">
                {row.cells.map((cell) => (
                  <div
                    key={cell.key}
                    title={cell.title}
                    className={`${cellClassName} h-full min-h-4 rounded-sm ${
                      cell.label
                        ? `${TINTED_TONE[cell.tone]} flex items-center justify-center text-[11px] font-mono font-bold text-foreground`
                        : SOLID_TONE[cell.tone]
                    }`}
                  >
                    {cell.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
