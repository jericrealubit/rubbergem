
# RubberGem Production Tracking System

A single-page operational tool for rubber-press manufacturing shift logging. Operators use a mobile-optimized entry terminal to log press cycles in real time; a live audit table, a printable single-page PDF sheet, and a browsable production history let anyone — including a remote viewer who never logs in — see shift performance as it happens.

---
Live: https://waai.au/rubbergem
---

<img width="50%" height="50%" alt="image" src="https://github.com/user-attachments/assets/1c17b4e4-5a39-41c9-ab72-1ecd815845e5" />

---
## 🚀 Technical Stack

- **Framework:** Next.js 16 (App Router), deployed as a **static export** (`output: "export"` in `next.config.ts`, served from `https://waai.au/rubbergem`)
- **Library:** React 19 (hooks, `localStorage`-backed state)
- **Database & Realtime:** Supabase (Postgres + Row Level Security + Realtime subscriptions)
- **Styling:** Tailwind CSS v4 & a custom `@media print` stylesheet for the audit sheet
- **Icons:** Lucide React
- **UI Components:** shadcn/ui (`radix-nova` style) primitives — Card, Button, Input, Select, Checkbox, RadioGroup

---
## 🛠️ Main Application Features

`app/page.tsx` is a client-side view switcher (not the Next.js router) that swaps between four views by local state — there is effectively one route. It also owns login/session state and a global per-cycle countdown timer, both passed down as props.

### 1. Entry Terminal (`components/PressForm.tsx`)
- **Press switcher:** toggles the active config between **Press #1** and **Press #2**.
- **Collapsible shift panel:** operator, shift group, press number, and per-table mat type (`DF`, `DD`, `CF`, `CD`, `SG`), with an inline summary shown even when collapsed.
- **Smart timestamps:** tap-to-start / tap-to-end cycle timing with automatic duration parsing, including midnight-crossover handling (23:55 → 00:20 correctly computes as 25 minutes).
- **Defect capture:** an absolute-coordinate grid for marking short-mold position per table, plus a Left/Middle/Right bubble-defect checkbox matrix with size selection.
- **Debounced shared broadcast:** shift setup (operator, shift, press, run time, mat types) is mirrored to a shared `shift_config` Supabase row while logged in, so a remote viewer sees the live setup without needing to log in.
- **Live archiving:** every cycle submit both inserts into `live_log` and re-aggregates the whole shift into a single upserted `production_logs` row, so History reflects the shift as it happens rather than only after a reset.
- **Duplicate-submit guard:** the submit button disables itself while a submission is in flight.

### 2. Live Audit Table (`app/ProductionTable.tsx`)
- **Shift header strip:** operator, press, and shift setup shown once per sheet, live-subscribed to `shift_config` and `live_log` via Supabase Realtime.
- **Runtime column:** records the target run time (minutes) that was active *when each cycle was submitted*, persisted per-row so later changes to the target don't rewrite earlier rows' history.
- **Total Downtime (default: 17m):** sums, across the shift, how many minutes each cycle's load time ran over the 17-minute default (clamped at 0 per cycle), shown in red.
- **15-row fixed grid:** always renders 15 rows (real cycles + filler) so every printed sheet has the same shape.
- **One-reject-per-table-per-cycle rule:** a table counts as a reject if *either* a short-mold position or a bubble checkbox is set, never more than once per cycle.
- **Landscape print/PDF:** an embedded `@media print` stylesheet force-fits the full 15-row sheet onto a single landscape page.
- **Reset Shift Log:** login-gated, destructive action that clears `live_log` for the next shift (via the `reset_shift_log` Postgres RPC) — the shift's data is already archived in `production_logs` by this point. The reset now verifies the delete actually happened before reporting success.

### 3. Production History (`components/ProductionHistory.tsx`)
- Reads archived shifts from `production_logs`, grouped by month and day.
- Each day expands to show per-table good/reject counts, total cycles, Accumulated Load Time, and Total Downtime for that specific shift.
- Day and Night shifts on the same date expand/collapse independently.
- Shows a clear error banner (instead of a silent empty list) if the fetch fails.

### 4. About Page (`app/AboutPage.tsx`)
- In-app, plain-language explanation of what the system does and how, aimed at non-technical readers (operators, management) — kept in sync with this README's feature list.

### 5. Shell Navigation (`app/page.tsx`)
- Slide-out burger menu switching between the entry form, live table, history, and about views without losing in-progress form state.
- Handles Supabase Auth session state and a global per-cycle countdown timer (started from the shift's target run time on each submit).

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

- `shift_config.sql` — creates the `shift_config` table + RLS policies.
- `reset_shift_log.txt` — creates the `reset_shift_log(p_shift_id text)` RPC used by "Reset Shift Log".
- `production_logs_rls.sql` — RLS policies for the `production_logs` table.
- `live_log_add_run_time.sql` — adds the `run_time_minutes` column to `live_log`.

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

---
## 🗂️ Project Directory Topology

```text
rubbergem/
├── app/
│   ├── page.tsx                    # View switcher shell, auth/session, global cycle timer
│   ├── ProductionTable.tsx         # Live audit table, print/PDF layout, Reset Shift Log
│   ├── AboutPage.tsx               # In-app plain-language system overview
│   ├── layout.tsx                  # Root layout / viewport config
│   └── globals.css                 # Base styling layer
├── components/
│   ├── PressForm.tsx               # Entry terminal: cycle capture, live_log/production_logs writes
│   ├── ProductionHistory.tsx       # Archived shift browser (production_logs)
│   └── ui/                         # shadcn/ui primitives (Card, Button, Input, Select, etc.)
├── lib/
│   └── supabase.ts                 # Supabase client (anon key)
├── shift_config.sql                # Manual SQL: shift_config table + RLS
├── reset_shift_log.txt             # Manual SQL: reset_shift_log RPC
├── production_logs_rls.sql         # Manual SQL: production_logs RLS
├── live_log_add_run_time.sql       # Manual SQL: live_log.run_time_minutes column
├── package.json
└── README.md
```
