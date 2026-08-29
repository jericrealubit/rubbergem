// Sequential red-ramp bucketing for the /tv dashboard's two magnitude
// heatmaps (defect-location counts, historical reject rates).

/**
 * Bucket a raw defect count (occurrences at one position/side this shift).
 * Dark-theme adapted: low magnitude -> dark/desaturated red, high magnitude
 * -> bright red, since a light-mode red-50 would be invisible on a
 * neutral-950 page.
 */
export function countToRedBucket(count: number): string {
  if (count === 0) return "bg-neutral-800";
  if (count === 1) return "bg-red-900/40";
  if (count <= 3) return "bg-red-800";
  if (count <= 6) return "bg-red-600";
  if (count <= 10) return "bg-red-500";
  return "bg-red-400";
}

/**
 * Bucket a reject rate (0..1): light red for a low rate, progressively
 * darker red for a higher rate. `null` means no shift ran that day/slot --
 * kept visually distinct from an actual 0% rate.
 */
export function rateToRedBucket(rate: number | null): string {
  if (rate === null) return "bg-neutral-800/60";
  if (rate === 0) return "bg-neutral-700";
  if (rate < 0.02) return "bg-red-600/35";
  if (rate < 0.05) return "bg-red-600/50";
  if (rate < 0.1) return "bg-red-700/65";
  if (rate < 0.2) return "bg-red-800/80";
  return "bg-red-900/95";
}
