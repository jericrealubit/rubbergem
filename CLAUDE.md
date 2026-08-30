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

### Data flow: multi-table Supabase model

All persistence is via Supabase (`lib/supabase.ts`, anon key client using `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`). There are four tables with a specific lifecycle relationship:

- **`live_log`** — one row per production cycle for the _currently open_ shift (`shift_id` currently hardcoded to `1` everywhere). Written by `components/PressForm.tsx` on each cycle submit. Read live by `app/ProductionTable.tsx`, which also subscribes to Postgres realtime changes on this table (`supabase.channel(...).on("postgres_changes", ...)`) so the audit table updates without a refresh.
- **`production_logs`** — exactly **one row per `(date, shift group)`**, written **live** as the shift runs. On every cycle submit, `PressForm.tsx` re-aggregates all `live_log` rows for the shift and writes a single row. Two things enforce the one-row rule, and both matter: **(1) identity is resolved from the database, not localStorage.** The table has no `shift_group` column — the shift is embedded in the free-text `operator_shift` as `` `${operator} (${shift})` `` — so before writing, `PressForm.tsx` selects the rows for `currentDate` and picks the one whose group matches, deriving the group with `shiftGroupOf` from `lib/shift-log.ts`. `localStorage["production_log_id"]` is only a per-browser fast path (preferred when it's among the matches); it is **not** the identity. It used to be, and that was the duplicate-row bug: a second terminal, a cleared browser store, a mid-shift reset or the stale-clear dialog each had no cached id and so inserted a second row for the same shift. **(2) cycles merge, they don't replace.** The row's stored `cycles` are unioned with the fresh `live_log` aggregation via `mergeCycles` (deduped on `cycle_number|start_time|end_time`, live wins, sorted by `start_time`), and the per-table yields and totals are recomputed from that merged set with `tableYieldsFromCycles`. This is what makes a mid-shift "Reset Shift Log" lossless: post-reset cycle numbers restart at 1, but their Perth times differ, so both halves survive in the one row. `handleResetLog` still removes `production_log_id`, which is now harmless — the next submit re-finds the same row and continues it rather than starting a new one. An insert that loses a race returns SQLSTATE `23505` (once the index from `production_logs_dedupe.sql` exists) and is handled by re-resolving and updating. `production_logs_dedupe.sql` is the optional, manually-run cleanup: inspect duplicates, delete the losers (most cycles wins), then add a unique index on `(date, (position('night' in lower(operator_shift)) > 0))`. `ProductionHistory.tsx` also collapses duplicates on read, so pre-existing ones never render twice. The same `findShiftLogRow` lookup gates the **stale-clear dialog** in `handleSubmit`: whenever `live_log` holds rows, they are offered up for wiping only when there is _no_ history row for today's date + shift group. A row means the shift is already open and those cycles are live — this terminal is just joining it. No row means they belong to some other shift and really are stale. Note the dialog is **not** gated on `production_log_id`: that answers a different question and gets it wrong both ways — absent on a terminal joining a live shift (prompting to wipe a running shift), and present but pointing at another shift's row after a day→night Shift Group switch or a Perth date rollover (silently sweeping the previous shift's cycles into the new one). NOTE: the `reset_shift_log` RPC (SQL in `reset_shift_log.txt`, applied manually in the Supabase SQL editor — not via a migration tool) is a **pure delete** — `DELETE FROM live_log WHERE shift_id::text = p_shift_id` plus (as of the chat feature) `DELETE FROM shift_messages WHERE shift_id::text = p_shift_id`, both keyed off the single TEXT param. It no longer aggregates or archives; the archive already exists in `production_logs` by shift-end. `handleResetLog` is still destructive and session-gated (requires login), so treat that path carefully.
- **`shift_config`** — a single row (`shift_id = 1`) holding the _current_ shift's setup: `operator`, `shift_group` (`day`/`night`), `press_number`, `run_time_minutes`, and `mat_types` (JSONB `{tableId: matCode}`). SQL in `shift_config.sql`, applied manually in the Supabase SQL editor (table + RLS: anon SELECT, authenticated INSERT/UPDATE + realtime publication). Written by `PressForm.tsx` via a **debounced, login-gated** `upsert` whenever a shift field changes (localStorage stays the per-terminal source of truth; this row is the shared broadcast). Read + realtime-subscribed by `ProductionTable.tsx`, whose header strip shows these values so a remote viewer (the boss) sees the live shift instead of localStorage defaults. `handleResetLog` clears `operator` + `run_time_minutes` (keeps `press_number`/`mat_types`). Single-active-shift assumption: if two logged-in terminals edit setup at once, last-writer-wins on the one row.
- **`shift_messages`** — the shift-scoped two-way chat between anonymous viewers and the logged-in operator (`components/ChatPanel.tsx`, rendered globally in `app/page.tsx`'s header so it's reachable from every view). SQL in `shift_messages.sql`, applied manually in the Supabase SQL editor. Unlike every other table here, RLS grants **both SELECT and INSERT to `anon`** (not just `authenticated`) — this is the one place "anyone" (no login) can write to the database, by design, since the whole point is letting an unauthenticated visitor message the operator. There is no UPDATE/DELETE policy; messages are cleared only via the same `reset_shift_log` RPC that clears `live_log`, so chat history is scoped to the current shift like everything else.
- `components/ProductionHistory.tsx` reads only from `production_logs` and groups archived shifts by month/day for browsing past yields. It collapses rows to one entry per `(date, shift group)` — keeping the row with the most cycles, highest `id` breaking a tie — so rows duplicated before the write path was fixed still render once, and month totals don't double-count. It deliberately does **not** recompute yields from the merged cycles: rows backfilled by `migrate.js` may have `cycles` without `short_mold_json`, so the winning row's stored `table_line_output_yields` are shown as-is.
- `lib/shift-log.ts` holds the shift-identity and cycle-merge helpers shared by the write and read paths — `shiftGroupOf` (the single definition of the `includes("night")` test; both sides must agree or a shift stops matching its own row), `cycleKey`, `mergeCycles`, `tableYieldsFromCycles`.
- `migrate.js` is a one-off script used previously to backfill `production_logs` from a legacy `public/rubber/data/data.json` file. It hardcodes empty Supabase credentials — not runnable as-is, kept for reference only.

### Reject/defect model

A table's cycle output is binary good/reject — there is **no** partial-credit scoring. A table counts as a reject for a cycle if _either_ a short-mold position was selected (`selectedTableSquares`, one of 5 grid positions) _or_ any bubble checkbox is set (`bubbleCheckboxes.{left,middle,right}`), regardless of how many defect types apply. This "max 1 reject per table per cycle" rule is computed independently in three places that must stay in sync if the logic ever changes: the submit handler in `PressForm.tsx` (which bakes `good`/`reject` into each cycle's `short_mold_json`), the `production_logs` aggregation in `tableYieldsFromCycles` (`lib/shift-log.ts`, which sums those baked `good`/`reject` per table across the shift's merged cycles), and the footer stats in `ProductionTable.tsx` (`getTableStats`, `faultyMatsProduced`). The old SQL aggregation in `reset_shift_log.txt` is no longer a source of this logic — that function only deletes now.

### Timezone handling

The shop operates on Perth time (`Australia/Perth`), but timestamps are stored/compared in various ways (`Intl.DateTimeFormat` with `timeZone: "Australia/Perth"`, manual `+08:00` offset construction in `PressForm.tsx`, UTC conversions in the SQL RPC). When touching date/time logic, check `PressForm.tsx`'s timestamp construction and its `currentDate` (Perth `YYYY-MM-DD`, used as the `production_logs.date`) together — recent commit history (`fix perthdate`, `fix perth time on resetlog`, `fix logsave by adding 1 to date`) shows this has been a recurring source of off-by-one-day bugs.

### State persistence pattern

`PressForm.tsx` mirrors nearly all form state to `localStorage` (both shift-level config like operator/shift-group/mat-types, and in-progress cycle values like start/end time and defect selections), and polls `localStorage` every second plus listens for the `storage` event so that multiple open tabs/devices on the same terminal stay roughly in sync. When adding new form fields, follow the existing pattern: `useState` initializer reads from `localStorage`, a dedicated `useEffect` writes on change, and the polling `handleStorageChange` function is updated to re-read it.

### UI components

`components/ui/*` are shadcn/ui primitives (`style: "radix-nova"`, `baseColor: "neutral"`, see `components.json`) — treat these as generated/vendored building blocks rather than hand-rolled app code; prefer adding new shadcn components via the shadcn CLI conventions over editing primitives directly unless fixing a real bug in them.

### Print layout

`app/ProductionTable.tsx` embeds a `@media print` stylesheet directly (`<style jsx global>`) to force the 15-row audit grid onto a single landscape page (`@page { size: landscape; margin: 0.2cm 0.3cm; }`, `.no-print` for UI chrome, `.print-compact` for tightened table padding). Any layout change to this table should be checked in both screen and print (`window.print()`) rendering.

# Design System Instructions

Build the application around a user-selectable theme system. The six visual references are located in `/design-references/themes/`.

Available themes:

- `editorial-minimal`: off-white paper, charcoal text, serif display typography, thin rules, muted cobalt accent.
- `dark-glass`: near-black navy, translucent glass cards, violet and cyan gradients, luminous borders.
- `organic-wellness`: cream, sage, terracotta, olive, botanical shapes, soft rounded surfaces.
- `cobalt-brutalist`: white, black, electric cobalt, oversized typography, thick borders, asymmetric grid.
- `soft-3d`: lavender, peach, mint, navy, soft shadows, rounded clay-like surfaces and friendly illustrations.
- `retro-future`: black, acid lime, orange, cream, geometric artwork, condensed typography, waveform details.

Requirements:

1. Implement themes with semantic design tokens, preferably CSS variables.
2. Do not hard-code theme colors inside individual components.
3. Every page and shared component must use semantic tokens such as `--color-background`, `--color-surface`, `--color-text`, `--color-muted`, `--color-primary`, `--color-border`, `--radius-card`, and `--shadow-card`.
4. Add a persistent theme switcher that works across the entire app.
5. Persist the selected theme in localStorage and apply it before the page visibly renders when possible.
6. Respect system dark mode only as the initial default; the user's explicit selection takes priority.
7. Add keyboard-accessible theme switching with visible focus states.
8. Include a compact theme picker in the header or settings area. Show each theme name and a small color preview.
9. Make sure the switcher works on mobile and desktop.
10. Preserve the existing application functionality while changing visual tokens.
11. Do not create six unrelated copies of every component. Use one component system driven by theme tokens.
12. After implementation, test every theme on the main routes and fix contrast, overflow, and unreadable text.

Before coding, inspect the existing framework, styling system, routing, and component structure. Reuse the current conventions instead of introducing a second styling system.
