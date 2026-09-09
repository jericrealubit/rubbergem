"use client";

import { useSyncExternalStore } from "react";
import PressPanel from "@/components/tv/PressPanel";
import BalesPanel from "@/components/tv/BalesPanel";
import BanburyPanel from "@/components/tv/BanburyPanel";
import { TV_LINES, type TvLine } from "@/components/tv/types";

const LINE_STORAGE_KEY = "tv-line";
const DEFAULT_LINE: TvLine = "press";

function isTvLine(value: string | null): value is TvLine {
  return !!value && TV_LINES.some((option) => option.id === value);
}

// The remembered line is read through useSyncExternalStore rather than a
// useState initialiser: /tv is prerendered by the static export, so the
// server snapshot is always DEFAULT_LINE while the client's is whatever the
// screen was left on. That is exactly the mismatch this hook exists to
// resolve — React hydrates against the server snapshot and then re-renders
// with the stored one, instead of the hydration error a localStorage read
// during render would raise. Subscribing to `storage` on top of it keeps two
// tabs of the wallboard on the same line, matching how the forms sync.

const listeners = new Set<() => void>();

/** Set when localStorage is unavailable, so the switcher still works. */
let sessionLine: TvLine | null = null;

function subscribeLine(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getLineSnapshot(): TvLine {
  try {
    const stored = window.localStorage.getItem(LINE_STORAGE_KEY);
    if (isTvLine(stored)) return stored;
  } catch {
    // Private mode / storage disabled — fall through to the session value.
  }
  return sessionLine ?? DEFAULT_LINE;
}

function getServerLineSnapshot(): TvLine {
  return DEFAULT_LINE;
}

function selectLine(next: TvLine) {
  sessionLine = next;
  try {
    window.localStorage.setItem(LINE_STORAGE_KEY, next);
  } catch {
    // Non-fatal: sessionLine still drives this tab.
  }
  listeners.forEach((listener) => listener());
}

/**
 * The wallboard route — one read-only screen per production line, switched
 * from the header.
 *
 * Each line's panel owns its own Supabase reads, shift-history selection and
 * layout, so switching lines unmounts the previous line's realtime channels
 * rather than holding all three lines' subscriptions open on a screen showing
 * one. The shell here is only the viewport frame and the remembered choice.
 */
export default function TvPage() {
  const line = useSyncExternalStore(
    subscribeLine,
    getLineSnapshot,
    getServerLineSnapshot,
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col p-4 gap-3">
      {line === "press" && <PressPanel line={line} onSelectLine={selectLine} />}
      {line === "bales" && <BalesPanel line={line} onSelectLine={selectLine} />}
      {line === "banbury" && (
        <BanburyPanel line={line} onSelectLine={selectLine} />
      )}
    </div>
  );
}
