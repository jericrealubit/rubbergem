
# Rubber Production Tracking System

A single-page operational tool for rubber manufacturing shift logging, covering **three production lines** — **Press**, **Banbury** and **Bales**. Operators use a mobile-optimized entry terminal to log their line's cycles in real time; a live audit table, a printable single-page PDF sheet, and a browsable production history let anyone — including a remote viewer who never logs in — see shift performance as it happens.

---
Live: https://waai.au/rubber
---

<img width="50%" height="50%" alt="image" src="https://github.com/user-attachments/assets/1c17b4e4-5a39-41c9-ab72-1ecd815845e5" />

---
## 🚀 Technical Stack

- **Framework:** Next.js 16 (App Router), deployed as a **static export** (`output: "export"` in `next.config.ts`, served from `https://waai.au/rubber`)
- **Library:** React 19 (hooks, `localStorage`-backed state)
- **Database & Realtime:** Supabase (Postgres + Row Level Security + Realtime subscriptions)
- **Styling:** Tailwind CSS v4, semantic CSS custom-property design tokens (`--background`, `--primary`, `--card`, `--border`, `--radius-card`, `--shadow-card`, etc.) driving a 9-theme system, & a custom `@media print` stylesheet for the audit sheets
- **Icons:** Lucide React
- **UI Components:** shadcn/ui (`radix-nova` style) primitives — Card, Button, Input, Select, Checkbox, RadioGroup

---
## 🏭 The Three Production Lines

Each line is a self-contained module: its own entry form, live audit table and history view, its own Supabase tables, its own reset RPC, and its own login account (`lib/line-accounts.ts`). A line's form only writes when *that* line's account is signed in, and signing in reorders the burger menu so your line's screens come first.

| | **Press** | **Banbury** | **Bales** |
|---|---|---|---|
| **Account** | `press@rubbergem.com` | `banbury@rubbergem.com` | `bales@rubbergem.com` |
| **Entry form** | `components/PressForm.tsx` | `components/BanburyForm.tsx` | `components/BalesForm.tsx` |
| **Live table** | `app/ProductionTable.tsx` | `app/BanburyTable.tsx` | `app/BalesProductionTable.tsx` |
| **History** | `components/ProductionHistory.tsx` | `components/BanburyHistory.tsx` | `components/BalesHistory.tsx` |
| **Shared helpers** | `lib/shift-log.ts` | `lib/banbury-log.ts` | `lib/bales-log.ts` |
| **Live rows** | `live_log` | `banbury_live_log` | `bales_live_log` |
| **Archive** | `production_logs` | `banbury_production_logs` | `bales_production_logs` |
| **Shift setup** | `shift_config` | `banbury_shift_config` | `bales_shift_config` |
| **Reset RPC** | `reset_shift_log` | `reset_banbury_shift_log` | `reset_bales_shift_log` |
| **An "entry" is** | one press cycle | one chemical/tank check | one bag-run |
| **Grid height** | 16 rows | 32 rows | 22 rows |
| **Downtime rule** | past a **17 min** load target | past a **14 min** check cycle | — (Total Run Time instead) |

All three archives hold **exactly one row per `(date, shift group)`**, written live as the shift runs. Identity is resolved from the database on every write (`localStorage` is only a per-browser fast path, never the identity), backed by a unique index — created directly for Banbury/Bales, and via the optional cleanup pass in `production_logs_dedupe.sql` for Press, whose table predates the rule. A losing insert returns SQLSTATE `23505` and is handled by re-resolving and updating. Cycles are merged rather than replaced on each write, so a mid-shift reset or a second terminal joining an open shift never splits or loses a shift's data.

### 1. Press (`PressForm` · `ProductionTable` · `ProductionHistory`)
- **Press switcher:** toggles the active config between **Press #1** and **Press #2**.
- **Four tables per cycle,** each with its own mat type (`DF`, `DD`, `CF`, `CD`, `SG`).
- **Defect capture:** an absolute-coordinate grid for marking short-mold position per table, plus a Left/Middle/Right bubble-defect checkbox matrix with size selection.
- **One-reject-per-table-per-cycle rule:** a table counts as a reject if *either* a short-mold position or a bubble checkbox is set, never more than once per cycle. Computed identically in three places (`PressForm`'s submit handler, `tableYieldsFromCycles`, `ProductionTable`'s footer stats) — keep them in sync.
- **Runtime column:** records the target run time (minutes) active *when each cycle was submitted*, persisted per-row so later changes to the target don't rewrite earlier rows.
- **Total Downtime (17m):** load time is the cycle's elapsed time minus the press's configured run time; the shift total sums every minute past the 17-minute target (clamped at 0 per cycle), shown in red.
- **Wallboard:** `/tv` — the one extra route in the app, a Press-only read-only dashboard (KPI row, defect-location heatmap, cycle sequence grid, historical trend heatmap) for a control-room screen.

### 2. Banbury (`BanburyForm` · `BanburyTable` · `BanburyHistory`)
- **Chemical/tank checklist:** six material ticks (Crumb Rubber, Other Rubbers, Powdered Chemicals, RPO, Sulphur, Liquid Chemicals) that **default to ticked** — the paper sheet is overwhelmingly all-ticked, so the operator only un-ticks the exceptions. Logging a check is deliberately *not* gated on all six being green.
- **Tank levels:** right/left, stored as `TEXT` because the paper cell holds either a number (`302`) or the word `Full`.
- **Check cycles:** tap to open, log to close — the row spans `start_time` → `check_time` with `run_time_minutes` between them, and logging immediately opens the next cycle, so the interval doubles as "time since the last check".
- **Total Downtime (14m):** every minute a check cycle runs past the standard 14-minute cycle, summed for the shift. Defined once in `lib/banbury-log.ts` (`BANBURY_DEFAULT_RUN_TIME_MINUTES`, `checkDowntimeMinutes`, `isCheckOverrun`, `totalDowntimeMinutes`) and consumed by the form, table and history so the three can't drift.
- **Shift-wide output totals:** unlike Press/Bales, a Banbury entry carries no output. Product, bag weight, batches made and 30-mesh bag count live on `banbury_shift_config`, and Tonnes (`bags × bag weight ÷ 1000`) and Average Output P/H (`tonnes ÷ run time`) are computed client-side from the sheet's own formulas and snapshotted into the archive.

### 3. Bales (`BalesForm` · `BalesProductionTable` · `BalesHistory`)
- **Per-cycle counts:** bales produced, bale type, faulty bales count and notes — no four-table or good/reject split, so the rollups are straight sums (`balesTotalsFromCycles`).
- **Computed end time:** `end_time` isn't operator-entered; it's `start_time + run_time_minutes`, stored so the table doesn't have to re-derive it.
- **Mesh type snapshotted per row,** so changing the shift-wide mesh type never retroactively alters historic rows.
- **Bag changes:** a separate append-only `bales_bag_changes` log (East/West side, weight in kg, auto-numbered per side) written from its own dialog and shown as a mini-log on the table — an immutable event record, with no UPDATE policy.
- **Shift-level `main_issues_faults`** free-text summary alongside the per-cycle notes.

---
## 🛠️ Main Application Features

`app/page.tsx` is a client-side view switcher (not the Next.js router) that swaps between **ten views** by local state — an entry form, live table and history for each of the three lines, plus the About page. `/tv` is the only other route. `page.tsx` also owns login/session state, the burger-menu nav (grouped per line, reordered so the signed-in line comes first), a global per-cycle countdown timer, and the shift chat panel — all passed down as props.

### 1. Entry Terminals
- **Collapsible shift panel** per line, with an inline summary shown even when collapsed.
- **Smart timestamps:** tap-to-start / tap-to-log cycle timing with automatic duration parsing, including midnight-crossover handling (23:55 → 00:20 correctly computes as 25 minutes). Logging an entry stamps its end and immediately opens the next cycle.
- **Debounced shared broadcast:** shift setup is mirrored to that line's `*_shift_config` row while logged in, so a remote viewer sees the live setup without needing to log in. `localStorage` stays the per-terminal source of truth; the config row is the shared broadcast.
- **Live archiving:** every submit both inserts a live row and re-aggregates the shift into its single archive row, so History reflects the shift as it happens rather than only after a reset.
- **Stale-data guard:** if the live log still holds rows but no archive row exists for today's date + shift group, the form offers to clear them before continuing — rather than silently merging two shifts.
- **Duplicate-submit guard:** the submit button disables itself while a submission is in flight.

### 2. Live Audit Tables
- **Shift header strip:** operator, setup and running totals shown once per sheet, live-subscribed to that line's config and live-log tables via Supabase Realtime — no refresh needed.
- **Fixed-height grid:** always renders the same number of rows (real entries + filler) so every printed sheet has the same shape.
- **Landscape print/PDF:** an embedded `@media print` stylesheet force-fits the full sheet onto a single landscape page. Check layout changes in both screen and print rendering.
- **Reset Shift Log:** login-gated, destructive action that clears that line's live rows via its own `SECURITY DEFINER` RPC — the shift's data is already archived by this point. The reset verifies the delete actually happened before reporting success.

### 3. Production History
- Reads each line's archive, grouped by month and day. Press and Banbury shifts toggle between a
  totals summary and the full entry-by-entry table; Bales shows the shift totals.
- Day and Night shifts on the same date expand/collapse independently.
- Duplicate rows from before the one-row-per-shift write path was fixed are collapsed on read (most entries wins, highest `id` breaking a tie), so they never render twice or double-count a month.
- Shows a clear error banner (instead of a silent empty list) if the fetch fails.

### 4. Shift Chat (`components/ChatPanel.tsx`)
- A two-way chat between anonymous viewers and the logged-in operator, rendered in the global header so it's reachable from every view.
- The one place RLS grants **both SELECT and INSERT to `anon`** — by design, since the point is letting an unauthenticated visitor message the operator. Messages are cleared by the same `reset_shift_log` RPC, so chat history is shift-scoped like everything else.

### 5. About Page (`app/AboutPage.tsx`)
- In-app, plain-language explanation of the three lines and the behaviour they share, aimed at non-technical readers (operators, management) — kept in sync with this README.

### 6. Theme System (`components/theme/`)
- **9 selectable themes** (`theme-config.ts`): Classic, Editorial Minimal, Dark Glass, Organic Wellness, Cobalt Brutalist, Soft 3D, Retro Future, Neutral Elegance, and Tropical Jade Sunrise — each a `[data-theme="..."]` block in `app/globals.css` defining the same set of semantic tokens (`--background`, `--card`, `--primary`, `--muted`, `--border`, `--radius-card`, `--shadow-card`, ...).
- **One component system, not nine copies:** every page and shared component (including the `Card` family in `components/ui/card.tsx`, token-driven instead of hardcoded `rounded-xl`/`ring-1` values) consumes these semantic tokens, so a theme swap re-skins the whole app without per-component branching.
- **`ThemeProvider`** (`components/theme/ThemeProvider.tsx`): sets `data-theme` on `<html>`, persists the choice to `localStorage` (`app-theme` key), and syncs the `<meta name="theme-color">` tag for mobile browser chrome.
- **FOUC-free load:** `app/layout.tsx` inlines a small blocking script (`buildThemeInitScript` in `theme-config.ts`) that applies the stored theme — or the system's light/dark preference on first visit — before the page paints. The user's explicit pick always wins after that; it's never overwritten by a later system-preference change.
- **`ThemeSwitcher`** (`components/theme/ThemeSwitcher.tsx`): a WAI-ARIA radio group in the burger menu with live color-swatch previews per theme and full arrow-key/Home/End keyboard navigation.

---
## 📦 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root with your Supabase project's credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Set up the database

This project doesn't use a migration tool — the Supabase schema, RLS policies, and RPC functions are applied manually in the Supabase SQL editor. Run these SQL files (in the repo root) against your project:

**Press**
- `shift_config.sql` — `shift_config` table + RLS policies.
- `production_logs_rls.sql` — RLS policies for `production_logs`.
- `production_logs_dedupe.sql` — optional cleanup pass, then the one-row-per-shift-day unique index.
- `live_log_add_run_time.sql` — adds `run_time_minutes` to `live_log`.
- `reset_shift_log.txt` — the `reset_shift_log(p_shift_id text)` RPC (a pure delete of `live_log` + `shift_messages`).
- `shift_messages.sql` — the chat table, the one place `anon` may INSERT.

**Banbury**
- `banbury_live_log.sql`, `banbury_live_log_add_start_time.sql` — live checklist rows (the second file adds `start_time`/`run_time_minutes` to tables created earlier).
- `banbury_shift_config.sql` — current shift setup + shift-wide output totals.
- `banbury_production_logs.sql` — archive + unique index.
- `reset_banbury_shift_log.txt` — the reset RPC.

**Bales**
- `bales_live_log.sql`, `bales_shift_config.sql`, `bales_production_logs.sql`, `bales_bag_changes.sql`.
- `reset_bales_shift_log.txt` — the reset RPC.

The `live_log` and `production_logs` tables themselves are expected to already exist (see `components/PressForm.tsx`'s payload objects for the columns each one writes).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 5. Build for production

The build produces a static export (`next.config.ts`: `output: "export"`):

```bash
npm run build
npm run start
```

### 6. Lint

```bash
npm run lint
```

There is no test suite configured in this repo.

---
## 🗂️ Project Directory Topology

```text
rubbergem/
├── app/
│   ├── page.tsx                    # View switcher shell, auth/session, per-line nav, global cycle timer
│   ├── ProductionTable.tsx         # Press live audit table, print/PDF layout, Reset Shift Log
│   ├── BanburyTable.tsx            # Banbury live check log, downtime totals, print/PDF layout
│   ├── BalesProductionTable.tsx    # Bales live cycle table + bag-change mini-log
│   ├── AboutPage.tsx               # In-app plain-language overview of the three lines
│   ├── tv/page.tsx                 # Press-only wallboard dashboard (/tv)
│   ├── layout.tsx                  # Root layout, viewport config, blocking theme-init script
│   ├── manifest.ts, icon.tsx…      # PWA manifest and generated icons
│   └── globals.css                 # Base styling layer + one [data-theme="..."] token block per theme
├── components/
│   ├── PressForm.tsx               # Press entry terminal   → live_log / production_logs
│   ├── BanburyForm.tsx             # Banbury entry terminal → banbury_live_log / banbury_production_logs
│   ├── BalesForm.tsx               # Bales entry terminal   → bales_live_log / bales_production_logs
│   ├── ProductionHistory.tsx       # Press archived-shift browser
│   ├── BanburyHistory.tsx          # Banbury archived-shift browser
│   ├── BalesHistory.tsx            # Bales archived-shift browser
│   ├── ChatPanel.tsx               # Shift-scoped two-way chat (shift_messages)
│   ├── tv/                         # Wallboard widgets: KPI row, heatmaps, cycle sequence grid
│   ├── theme/
│   │   ├── theme-config.ts         # Theme IDs/labels, storage key, FOUC-prevention init script
│   │   ├── ThemeProvider.tsx       # data-theme + localStorage + meta theme-color sync
│   │   └── ThemeSwitcher.tsx       # Keyboard-accessible theme picker (burger menu)
│   └── ui/                         # shadcn/ui primitives — token-driven, theme-agnostic
├── lib/
│   ├── supabase.ts                 # Supabase client (anon key)
│   ├── line-accounts.ts            # The three per-line login accounts + active-line lookup
│   ├── shift-log.ts                # Press shift identity, cycle merge, table yields
│   ├── banbury-log.ts              # Banbury check merge + downtime helpers (14-minute cycle)
│   ├── bales-log.ts                # Bales cycle merge + shift totals
│   └── heatmap-color.ts            # Wallboard heatmap colour scale
├── shift_config.sql                # ─┐
├── production_logs_rls.sql         #  │
├── production_logs_dedupe.sql      #  │
├── live_log_add_run_time.sql       #  ├─ Manual SQL, applied in the Supabase SQL editor
├── shift_messages.sql              #  │  (see "Set up the database" above)
├── banbury_*.sql                   #  │
├── bales_*.sql                     #  │
├── reset_*.txt                     # ─┘  SECURITY DEFINER reset RPCs, one per line
├── package.json
└── README.md
```
