// Degraded-mode shim for banbury_live_log's cycle-timing columns.
//
// start_time / run_time_minutes were added to banbury_live_log after the fact
// (banbury_live_log_add_start_time.sql), and every table in this project is
// applied by hand in the Supabase SQL editor -- so the app regularly runs
// against a database that doesn't have them yet. components/BanburyForm.tsx
// already survives that by re-inserting without the pair rather than losing
// the operator's whole check, but the timing itself was then gone for good:
// the audit grid showed "—" for Start with no cycle length, and the shift's
// archive row (banbury_production_logs.checks) carried run_time_minutes: null,
// which zeroes the shift's downtime everywhere it's totalled.
//
// The browser already knows those numbers at the moment it logs the check, so
// it keeps them here, keyed by check_number, until the columns exist. This is
// a stopgap, not a store: it is per-browser, it only covers the current shift,
// and it is deleted wholesale the first time an insert carrying the timing
// columns succeeds -- at which point the database is the only source again.
//
// Deliberately NOT part of the archived entry's identity. cycleKey() is built
// from cycle_number/start_time/end_time, so a shimmed entry keeps exactly the
// key it would have had without the shim and mergeCycles still recognises the
// entry already sitting in banbury_production_logs.checks instead of appending
// a second copy of it. Only run_time_minutes -- which no key reads -- is
// filled in from here.

const STORAGE_KEY = "banbury_check_timing";

/** Perth HH:mm of the tap that opened the cycle, and its length in minutes. */
export interface CheckTiming {
  startTime: string;
  runTimeMinutes: number;
}

type TimingMap = Record<string, CheckTiming>;

function readMap(): TimingMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as TimingMap) : {};
  } catch {
    // A hand-edited or half-written value shouldn't take the form down with
    // it -- the shim is best-effort by definition.
    return {};
  }
}

/** Every check this browser has timings for, keyed by check_number. */
export function readCheckTimings(): TimingMap {
  return readMap();
}

/** Remember one check's timing. No-op outside the browser. */
export function rememberCheckTiming(
  checkNumber: number,
  timing: CheckTiming,
): void {
  if (typeof window === "undefined") return;
  try {
    const map = readMap();
    map[String(checkNumber)] = timing;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota -- nothing to recover, the DB is still authoritative */
  }
}

/**
 * Drop everything. Called on a shift reset (check numbers restart at 1, so a
 * carried-over map would mis-time the new shift's checks) and the moment an
 * insert proves the real columns are there.
 */
export function clearCheckTimings(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

/** The remembered length of one check, or null if this browser never saw it. */
export function timingForCheck(
  checkNumber: number | null | undefined,
): CheckTiming | null {
  if (checkNumber === null || checkNumber === undefined) return null;
  return readMap()[String(checkNumber)] ?? null;
}
