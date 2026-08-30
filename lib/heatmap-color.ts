// Sequential destructive-opacity-ramp bucketing for the /tv dashboard's two
// magnitude heatmaps (defect-location counts, historical reject rates).
//
// Theme-aware: these used to hard-code a dark-theme-only neutral/red Tailwind
// ramp (bg-neutral-800 -> bg-red-900/40 -> ... -> bg-red-400), tuned on the
// assumption the page background is permanently a near-black neutral-950.
// That assumption no longer holds now that /tv inherits any of the six
// themes (some light-category). Instead, bucket into increasing opacity
// steps of the semantic `--destructive` token, which is itself tuned per
// theme for legibility against that theme's own `--background`/`--card` --
// so the same opacity ramp reads correctly whether the active theme is light
// or dark, with no per-theme branching needed here.

/**
 * Bucket a raw defect count (occurrences at one position/side this shift).
 * Zero uses a neutral (non-destructive) tone so an empty cell reads as
 * "nothing happened" rather than "low severity"; 1+ steps up through
 * increasing `--destructive` opacity to full-strength at the high end.
 */
export function countToRedBucket(count: number): string {
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-destructive/15";
  if (count <= 3) return "bg-destructive/30";
  if (count <= 6) return "bg-destructive/50";
  if (count <= 10) return "bg-destructive/70";
  return "bg-destructive";
}

/**
 * Bucket a reject rate (0..1): low opacity `--destructive` for a low rate,
 * progressively more opaque for a higher rate. `null` means no shift ran
 * that day/slot -- kept visually distinct (more muted) from an actual 0%
 * rate, which still gets a neutral (non-destructive) tone since it's a good
 * outcome, not a defect.
 */
export function rateToRedBucket(rate: number | null): string {
  if (rate === null) return "bg-muted/40";
  if (rate === 0) return "bg-muted";
  if (rate < 0.02) return "bg-destructive/20";
  if (rate < 0.05) return "bg-destructive/35";
  if (rate < 0.1) return "bg-destructive/50";
  if (rate < 0.2) return "bg-destructive/70";
  return "bg-destructive";
}
