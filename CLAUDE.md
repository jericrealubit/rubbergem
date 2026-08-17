# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Repository location

The project root is `C:\dev\rubbergem` — this is the git root and holds all source (`package.json`, `app/`, `components/`, `lib/`). There is no nested project directory.

## Stack

Next.js 16.2.9 (App Router) + React 19.2.4, Tailwind CSS v4, TypeScript, Supabase, shadcn/ui (radix-ui primitives). Node/Next commands run from the repo root.

## Commands

```bash
npm install       # install dependencies
npm run dev        # start Next.js dev server (localhost:3000)
npm run build       # production build — this is a static export (see next.config.ts)
npm run start       # serve the production build
npm run lint        # ESLint (eslint-config-next core-web-vitals + typescript)
```

There is no test suite configured in this repo.

## Critical: this is not the Next.js you know

`AGENTS.md` (imported above) flags that this project's Next.js version has breaking changes vs. training data. Read the relevant guide under `node_modules/next/dist/docs/` before writing Next.js-specific code (routing, config, data fetching, etc.), and heed any deprecation notices found there.

## Architecture

Rubber is a single-page operational tool for rubber-press manufacturing shift logging, deployed as a **static export** (`next.config.ts`: `output: "export"`, images unoptimized, no basePath) to `https://waai.au/rubber`. There is effectively one route — `app/page.tsx` is a client-side view switcher (not the Next.js router) that swaps between four views by local state: `form`, `table`, `history`, `about`. Auth, a global cycle-timer, and the burger-menu nav all live in this top-level component and are passed down as props.

### Data flow: two-table Supabase model

All persistence is via Supabase (`lib/supabase.ts`, anon key client using `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`). There are three tables with a specific lifecycle relationship:

- **`live_log`** — one row per production cycle for the *currently open* shift (`shift_id` currently hardcoded to `1` everywhere). Written by `components/PressForm.tsx` on each cycle submit. Read live by `app/ProductionTable.tsx`, which also subscribes to Postgres realtime changes on this table (`supabase.channel(...).on("postgres_changes", ...)`) so the audit table updates without a refresh.
- **`production_logs`** — one row per shift, written **live** as the shift runs. On every cycle submit, `PressForm.tsx` re-aggregates all `live_log` rows for the shift (into a JSON `cycles` array + per-table `good`/`reject` yields + totals) and upserts a single `production_logs` row. The row's `id` is tracked in `localStorage` under `production_log_id`: the first submit of a shift inserts the row (and stores its id), later submits update that same row. "Reset Shift Log" in `ProductionTable.tsx` (`handleResetLog`) removes `production_log_id` so the next shift starts a fresh row. NOTE: the `reset_shift_log` RPC (SQL in `reset_shift_log.txt`, applied manually in the Supabase SQL editor — not via a migration tool) is now a **pure delete** — `DELETE FROM live_log WHERE shift_id::text = p_shift_id` (single TEXT param). It no longer aggregates or archives; the archive already exists in `production_logs` by shift-end. `handleResetLog` is still destructive and session-gated (requires login), so treat that path carefully.
- **`shift_config`** — a single row (`shift_id = 1`) holding the *current* shift's setup: `operator`, `shift_group` (`day`/`night`), `press_number`, `run_time_minutes`, and `mat_types` (JSONB `{tableId: matCode}`). SQL in `shift_config.sql`, applied manually in the Supabase SQL editor (table + RLS: anon SELECT, authenticated INSERT/UPDATE + realtime publication). Written by `PressForm.tsx` via a **debounced, login-gated** `upsert` whenever a shift field changes (localStorage stays the per-terminal source of truth; this row is the shared broadcast). Read + realtime-subscribed by `ProductionTable.tsx`, whose header strip shows these values so a remote viewer (the boss) sees the live shift instead of localStorage defaults. `handleResetLog` clears `operator` + `run_time_minutes` (keeps `press_number`/`mat_types`). Single-active-shift assumption: if two logged-in terminals edit setup at once, last-writer-wins on the one row.
- `components/ProductionHistory.tsx` reads only from `production_logs` and groups archived shifts by month/day for browsing past yields.
- `migrate.js` is a one-off script used previously to backfill `production_logs` from a legacy `public/rubber/data/data.json` file. It hardcodes empty Supabase credentials — not runnable as-is, kept for reference only.

### Reject/defect model

A table's cycle output is binary good/reject — there is **no** partial-credit scoring. A table counts as a reject for a cycle if *either* a short-mold position was selected (`selectedTableSquares`, one of 5 grid positions) *or* any bubble checkbox is set (`bubbleCheckboxes.{left,middle,right}`), regardless of how many defect types apply. This "max 1 reject per table per cycle" rule is computed independently in three places that must stay in sync if the logic ever changes: the submit handler in `PressForm.tsx` (which bakes `good`/`reject` into each cycle's `short_mold_json`), the `production_logs` aggregation in `PressForm.tsx` (which sums those baked `good`/`reject` per table across the shift), and the footer stats in `ProductionTable.tsx` (`getTableStats`, `faultyMatsProduced`). The old SQL aggregation in `reset_shift_log.txt` is no longer a source of this logic — that function only deletes now.

### Timezone handling

The shop operates on Perth time (`Australia/Perth`), but timestamps are stored/compared in various ways (`Intl.DateTimeFormat` with `timeZone: "Australia/Perth"`, manual `+08:00` offset construction in `PressForm.tsx`, UTC conversions in the SQL RPC). When touching date/time logic, check `PressForm.tsx`'s timestamp construction and its `currentDate` (Perth `YYYY-MM-DD`, used as the `production_logs.date`) together — recent commit history (`fix perthdate`, `fix perth time on resetlog`, `fix logsave by adding 1 to date`) shows this has been a recurring source of off-by-one-day bugs.

### State persistence pattern

`PressForm.tsx` mirrors nearly all form state to `localStorage` (both shift-level config like operator/shift-group/mat-types, and in-progress cycle values like start/end time and defect selections), and polls `localStorage` every second plus listens for the `storage` event so that multiple open tabs/devices on the same terminal stay roughly in sync. When adding new form fields, follow the existing pattern: `useState` initializer reads from `localStorage`, a dedicated `useEffect` writes on change, and the polling `handleStorageChange` function is updated to re-read it.

### UI components

`components/ui/*` are shadcn/ui primitives (`style: "radix-nova"`, `baseColor: "neutral"`, see `components.json`) — treat these as generated/vendored building blocks rather than hand-rolled app code; prefer adding new shadcn components via the shadcn CLI conventions over editing primitives directly unless fixing a real bug in them.

### Print layout

`app/ProductionTable.tsx` embeds a `@media print` stylesheet directly (`<style jsx global>`) to force the 15-row audit grid onto a single landscape page (`@page { size: landscape; margin: 0.2cm 0.3cm; }`, `.no-print` for UI chrome, `.print-compact` for tightened table padding). Any layout change to this table should be checked in both screen and print (`window.print()`) rendering.
