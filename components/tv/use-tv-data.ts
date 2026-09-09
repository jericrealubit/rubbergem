"use client";

// Supabase read hooks shared by the three /tv line panels.
//
// Every line follows the same three read patterns -- a live cycle/check log,
// a single shift_config row, and a deduped production_logs archive -- against
// differently named tables. Before the wallboard covered Bales and Banbury
// each of those was written out inline in app/tv/page.tsx; keeping three
// copies of the realtime-subscribe/refetch dance (and three copies of the
// one-row-per-(date, shift group) dedupe) is exactly the drift CLAUDE.md
// warns about, so the pattern lives here once and takes the table name as a
// parameter.
//
// Every argument is a primitive so the effect dependency lists stay stable:
// passing a callback or an options object would re-subscribe on every render.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shiftGroupOf } from "@/lib/shift-log";

/** The columns every `*_production_logs` table shares. */
export interface ArchiveRow {
  id: number;
  date: string;
  operator_shift: string;
}

/** Perth `YYYY-MM-DD` for N days ago — the archive/trend cutoffs. */
export function perthDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
  }).format(d);
}

/**
 * A line's live cycle/check log (`live_log`, `bales_live_log`,
 * `banbury_live_log`, `bales_bag_changes`), kept current by a realtime
 * subscription. `connected` drives the header's LIVE/RECONNECTING lamp.
 */
export function useLiveRows<T>(
  table: string,
  columns: string,
  orderColumn: string,
  channel: string,
  ascending = true,
): { rows: T[]; connected: boolean } {
  const [rows, setRows] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      const { data } = await supabase
        .from(table)
        .select(columns)
        .eq("shift_id", 1)
        .order(orderColumn, { ascending });
      if (!cancelled && data) setRows(data as unknown as T[]);
    };

    fetchRows();

    const subscription = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => fetchRows(),
      )
      .subscribe((status) => {
        if (!cancelled) setConnected(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(subscription);
    };
  }, [table, columns, orderColumn, channel, ascending]);

  return { rows, connected };
}

/**
 * A line's single `*_shift_config` row (shift_id = 1) — the shared broadcast
 * of who is on shift and how the line is set up, so the wallboard shows the
 * live shift rather than one terminal's localStorage.
 */
export function useShiftConfig<T>(
  table: string,
  channel: string,
): { config: T | null; connected: boolean } {
  const [config, setConfig] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("shift_id", 1)
        .maybeSingle();
      if (!cancelled && data) setConfig(data as unknown as T);
    };

    fetchConfig();

    const subscription = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => fetchConfig(),
      )
      .subscribe((status) => {
        if (!cancelled) setConnected(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(subscription);
    };
  }, [table, channel]);

  return { config, connected };
}

/**
 * A line's `*_production_logs` archive, collapsed to one row per
 * (date, shift group) — the richest row wins (most cycles/checks), highest
 * `id` breaking a tie, exactly as ProductionHistory/BalesHistory/
 * BanburyHistory do on read. Rows duplicated before the write paths were
 * fixed therefore never render twice here either.
 *
 * `entriesColumn` names the JSONB array that measures richness ("cycles" for
 * Press/Bales, "checks" for Banbury). `sinceDate` limits the fetch to a
 * trailing window (the trend heatmaps); omit it for the full archive (the
 * shift picker).
 *
 * Sorted newest first, night before day within a date.
 */
export function useShiftArchive<T extends ArchiveRow>(
  table: string,
  columns: string,
  channel: string,
  entriesColumn: string,
  sinceDate?: string,
): T[] {
  const [rows, setRows] = useState<T[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      let query = supabase.from(table).select(columns);
      if (sinceDate) query = query.gte("date", sinceDate);
      const { data } = await query
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      if (!cancelled && data) setRows(data as unknown as T[]);
    };

    fetchRows();

    const subscription = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => fetchRows(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(subscription);
    };
  }, [table, columns, channel, sinceDate]);

  return useMemo(() => {
    const byShift = new Map<string, T>();

    rows.forEach((row) => {
      const key = `${row.date}|${shiftGroupOf(row.operator_shift)}`;
      const held = byShift.get(key);
      const rowEntries = countEntries(row, entriesColumn);
      const heldEntries = held ? countEntries(held, entriesColumn) : -1;
      if (
        !held ||
        rowEntries > heldEntries ||
        (rowEntries === heldEntries && row.id > held.id)
      ) {
        byShift.set(key, row);
      }
    });

    return Array.from(byShift.values()).sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      const aGroup = shiftGroupOf(a.operator_shift);
      const bGroup = shiftGroupOf(b.operator_shift);
      if (aGroup === bGroup) return 0;
      return aGroup === "night" ? -1 : 1;
    });
  }, [rows, entriesColumn]);
}

function countEntries(row: ArchiveRow, entriesColumn: string): number {
  const value = (row as unknown as Record<string, unknown>)[entriesColumn];
  return Array.isArray(value) ? value.length : 0;
}

/** "Jeric (night)" -> "Jeric". */
export function operatorNameOf(operatorShift: string | null | undefined): string {
  return (operatorShift || "").split("(")[0].trim();
}
