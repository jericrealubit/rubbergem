import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Cpu,
  Layers,
  Menu,
  Smartphone,
  LayoutDashboard,
  MapPin,
  Phone,
  User,
  ExternalLink,
  Sparkles,
  Database,
  ShieldAlert,
  History,
  Save,
  RotateCcw,
  Palette,
  Factory,
  ClipboardList,
  FlaskConical,
  Boxes,
} from "lucide-react";

/**
 * The three production lines the app keeps shift logs for. Each one owns its
 * own entry form, live table and history view, and is gated on its own login
 * account (lib/line-accounts.ts).
 *
 * Held as data rather than three near-identical JSX blocks so every line's
 * card renders through one component in one shape -- the same reason the rest
 * of the app is a single token-driven component system.
 */
const PRODUCTION_LINES = [
  {
    key: "press",
    name: "Press",
    icon: ClipboardList,
    account: "press@rubbergem.com",
    sheet: "Rubber press shift sheet",
    summary:
      "One entry per press cycle across four tables, with where each defect happened and how long the load took.",
    points: [
      {
        label: "Two presses, four tables",
        text: "Switch between Press #1 and Press #2 in one tap, with a mat type (DF, DD, CF, CD, SG) set per table.",
      },
      {
        label: "Defects marked on a diagram",
        text: "Tap the exact spot on an on-screen grid to record a short mold, and tick bubble defects by position (Left, Middle, Right) and size.",
      },
      {
        label: "Fair reject counting",
        text: "A table counts as one reject per cycle whether it has a short mold, a bubble, or both — the numbers can never be double-counted.",
      },
      {
        label: "Downtime past 17 minutes",
        text: "Load time is the cycle minus the press's own run time; every minute past the 17-minute target is added up as downtime for the shift.",
      },
    ],
  },
  {
    key: "banbury",
    name: "Banbury",
    icon: FlaskConical,
    account: "banbury@rubbergem.com",
    sheet: "30 mesh production & chemical check log",
    summary:
      "One entry per chemical and tank check, plus the shift-wide output totals from the bottom of the paper sheet.",
    points: [
      {
        label: "Un-tick the exceptions",
        text: "All six materials (Crumb Rubber, Other Rubbers, Powdered Chemicals, RPO, Sulphur, Liquid Chemicals) start ticked, because that is the normal row — you only mark what wasn't done.",
      },
      {
        label: "Both tank levels every check",
        text: "Right and left tank levels are required on every check, and accept either a number or the word \u201cFull\u201d, exactly like the paper cell.",
      },
      {
        label: "Downtime past 14 minutes",
        text: "A check cycle is timed from the moment you tap start to the moment you log it; every minute past the standard 14-minute cycle is added up as downtime for the shift.",
      },
      {
        label: "Shift output does the maths",
        text: "Batches, bags and bag weight give Tonnes and Average Output P/H automatically, using the sheet's own formulas.",
      },
    ],
  },
  {
    key: "bales",
    name: "Bales",
    icon: Boxes,
    account: "bales@rubbergem.com",
    sheet: "Baling shift sheet",
    summary:
      "One entry per bag-run, with how many bales came out, how many were faulty, and every bag change on either side.",
    points: [
      {
        label: "Counts, not diagrams",
        text: "Bales produced, bale type and faulty bale count per cycle — there is no four-table or short-mold concept on this line.",
      },
      {
        label: "East and West bag changes",
        text: "Bag changes are logged separately as they happen, with the side and weight in kg, and numbered automatically per side.",
      },
      {
        label: "Mesh type locked to the row",
        text: "The shift's mesh type is saved onto each cycle as it is logged, so changing it later never rewrites rows already recorded.",
      },
      {
        label: "Shift-level fault summary",
        text: "A Main Issues / Faults note is kept for the shift as a whole, alongside the per-cycle notes.",
      },
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <div className="w-full max-w-3xl ipad:max-w-4xl mx-auto p-4 ipad:p-6 space-y-6 pb-12 text-foreground">
      {/* Hero Header Card */}
      <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Cpu className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground/80 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> About This App
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary-foreground">
            Rubber — Shift Logging Made Simple
          </h1>
          <p className="text-primary-foreground/90 text-sm sm:text-base max-w-xl leading-relaxed font-medium">
            A simple app operators use on the shop floor to record every
            cycle, check, defect and minute of downtime across the three
            production lines — Press, Banbury and Bales — as it happens, so
            shift records stay accurate and the boss can see real production
            numbers without walking the floor.
          </p>
        </div>
      </div>

      {/* Technical Stack Architecture Ribbon */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-muted-foreground">
          <Layers className="w-3.5 h-3.5" /> Built With
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-3 bg-card border border-border/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">
              Framework
            </p>
            <p className="text-xs font-bold mt-0.5 text-foreground">
              Next.js
            </p>
            <p className="text-[10px] mt-1 text-muted-foreground leading-snug">
              The engine that makes the app fast and reliable on any device.
            </p>
          </div>
          <div className="p-3 bg-card border border-border/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">
              Database & Sync
            </p>
            <p className="text-xs font-bold mt-0.5 text-foreground">
              Supabase
            </p>
            <p className="text-[10px] mt-1 text-muted-foreground leading-snug">
              Where shift data is safely stored and shared instantly across
              devices.
            </p>
          </div>
          <div className="p-3 bg-card border border-border/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">
              Styling
            </p>
            <p className="text-xs font-bold mt-0.5 text-foreground">
              Tailwind CSS
            </p>
            <p className="text-[10px] mt-1 text-muted-foreground leading-snug">
              Keeps the app looking clean and working well on phones and
              tablets, with 9 switchable themes built on the same styling.
            </p>
          </div>
          <div className="p-3 bg-card border border-border/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">
              State & Cache
            </p>
            <p className="text-xs font-bold mt-0.5 text-foreground">
              Local Browser Storage
            </p>
            <p className="text-[10px] mt-1 text-muted-foreground leading-snug">
              Remembers what you were typing even if the page refreshes.
            </p>
          </div>
        </div>
      </div>

      {/* The Three Production Lines */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-muted-foreground">
          <Factory className="w-3.5 h-3.5" /> The Three Production Lines
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground px-1">
          One app, three separate shift logs. Each line has its own entry
          form, its own live table and its own history, and each is signed
          into with its own account — so the Banbury operator can never
          accidentally write onto the Press sheet. Everything below the line
          cards works the same way on all three.
        </p>

        <div className="space-y-3">
          {PRODUCTION_LINES.map((line) => {
            const LineIcon = line.icon;
            return (
              <Card
                key={line.key}
                className="bg-card border border-border/60 shadow-sm"
              >
                <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
                  <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex flex-wrap items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                      <LineIcon className="w-4 h-4" />
                    </div>
                    {line.name} Line
                    <span className="font-sans text-[10px] text-muted-foreground/70 normal-case font-medium">
                      {line.sheet}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground/70 lowercase font-normal border border-border rounded-full px-2 py-0.5 bg-card">
                      {line.account}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
                  <p>{line.summary}</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {line.points.map((point) => (
                      <li key={point.label}>
                        <strong className="text-foreground font-bold">
                          {point.label}:
                        </strong>{" "}
                        {point.text}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 mr-0.5">
                      Its own screens:
                    </span>
                    {["Entry Form", "Live Table", "History"].map((view) => (
                      <span
                        key={view}
                        className="text-[10px] font-bold uppercase tracking-wide rounded-md border border-border bg-muted/60 text-muted-foreground px-2 py-1"
                      >
                        {view}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Shared behaviour across all three lines */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-muted-foreground">
          <Layers className="w-3.5 h-3.5" /> What Every Line Shares
        </h2>

        {/* Feature 1: Quick Entry Form */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Smartphone className="w-4 h-4" />
              </div>
              1. Quick Entry Form{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                PressForm · BanburyForm · BalesForm
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              What the operator fills in on the floor, one cycle at a time.
              Each line has its own form, but all three behave the same way:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  Tap to start, tap to log:
                </strong>{" "}
                Open a cycle with one tap and log it with another — logging
                stamps the end time and immediately opens the next cycle, so
                nothing has to be typed twice and no gap goes unrecorded.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Stays out of the way:
                </strong>{" "}
                The shift details panel (operator, shift, date) can be
                collapsed to keep the screen clean on a phone, while still
                showing a short summary so you always know what&apos;s set.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Does the time math for you:
                </strong>{" "}
                Just enter a start and end time — the app works out how long
                the cycle took automatically, even across midnight (a cycle
                from 11:55pm to 12:20am is correctly counted as 25 minutes,
                not a negative number).
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Laid out like the paper sheet:
                </strong>{" "}
                Each form records exactly what its own sheet asks for — press
                defects on a diagram, Banbury chemical ticks and tank levels,
                Bales counts and bag changes (see the three line cards above).
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Warns about leftover data:
                </strong>{" "}
                If the live log still holds entries from a shift that already
                closed, the form asks before continuing instead of quietly
                mixing two shifts together.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Can&apos;t accidentally double-submit:
                </strong>{" "}
                The Submit button locks itself while an entry is saving, so a
                double-tap can&apos;t create two records for the same cycle.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 2: Saves Instantly to the Cloud */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Database className="w-4 h-4" />
              </div>
              2. Saves Instantly to the Cloud{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                Supabase database
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              Every entry you log — on any of the three lines — is sent
              straight to a secure online database; nothing lives only on the
              terminal:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  No waiting, no lost entries:
                </strong>{" "}
                Data is saved the moment you log it, so it&apos;s safe even if
                the terminal is turned off right after.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Everything stays together:
                </strong>{" "}
                All of an entry&apos;s detail — press defect positions and
                sizes, Banbury chemical ticks and tank levels, Bales counts
                and bag changes — is saved as one record, so nothing gets
                mixed up between cycles.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  History written as the shift runs:
                </strong>{" "}
                Each line keeps exactly one history record per date and shift,
                updated on every entry — so a shift is already archived long
                before anyone resets the live table, and a second terminal
                joining mid-shift adds to the same record instead of starting
                a rival one.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 3: Only Logged-In Operators Can Make Changes */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <ShieldAlert className="w-4 h-4" />
              </div>
              3. Each Line Has Its Own Login{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                Supabase Auth · lib/line-accounts.ts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              This keeps the records trustworthy — anyone can view the live
              board, but only signed-in operators can change it:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  Editing requires login:
                </strong>{" "}
                Logging an entry, changing shift settings, or resetting the
                log all require an active, logged-in session.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  One account per line:
                </strong>{" "}
                Press, Banbury and Bales each sign in with their own account,
                and a line&apos;s form only saves for its own account — so one
                line&apos;s operator can never write onto another line&apos;s
                sheet by mistake.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Your line comes first:
                </strong>{" "}
                Signing in moves your own line to the top of the menu, so the
                screens you actually use are the ones you land on.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Clear warnings, not silent failures:
                </strong>{" "}
                If your session drops, the app shows you a clear warning
                instead of quietly failing to save.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 4: Nothing Is Lost If the Page Closes */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Save className="w-4 h-4" />
              </div>
              4. Nothing Is Lost If the Page Closes{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                local browser backup
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              A safety net for accidental refreshes, closed tabs, or a
              terminal that loses power mid-entry:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  Auto-backup while you type:
                </strong>{" "}
                Whatever you&apos;re filling in — times, defect selections, notes —
                is quietly backed up on that device as you go.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Recently logged cycles:
                </strong>{" "}
                Kept in a simple, browsable list for quick reference on the
                terminal.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 5: The Live Shift Log Table */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              5. The Live Shift Log Table{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                ProductionTable · BanburyTable · BalesProductionTable
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              Every line has its own audit sheet — the whole shift on one
              screen, designed to print cleanly, and readable by anyone
              without logging in:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  Updates without a refresh:
                </strong>{" "}
                Entries appear on the sheet the moment they are logged, on
                every screen showing it — so the office can watch a shift run
                without touching anything.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Shift details shown once:
                </strong>{" "}
                Operator, shift, setup and the shift&apos;s running totals sit
                in one strip at the top instead of being repeated on every
                row.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Always the same number of rows:
                </strong>{" "}
                Each sheet fills to a fixed height — 16 rows for Press, 22 for
                Bales, 32 for Banbury — whether the shift had 3 entries or a
                full page, so every printed sheet looks the same.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Fair reject counting (Press):
                </strong>{" "}
                A cycle only ever counts as one reject per table, even if it
                has more than one type of defect — so the numbers can&apos;t be
                double-counted.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Settings frozen onto each row:
                </strong>{" "}
                The press run time, the Bales mesh type and the Banbury shift
                totals are recorded as they were at the moment each entry was
                logged — so changing a setting later in the shift never
                rewrites what was true earlier.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Total Downtime:
                </strong>{" "}
                Adds up, across the whole shift, every minute run past the
                standard cycle — beyond the 17-minute load target on Press,
                and beyond the 14-minute check cycle on Banbury. Overrunning
                entries and the shift total are both shown in red, so a slow
                shift stands out at a glance.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  One-tap PDF/print:
                </strong>{" "}
                &quot;Print PDF&quot; automatically formats the full sheet to fit
                neatly on a single landscape page.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 6: Simple Menu Navigation */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Menu className="w-4 h-4" />
              </div>
              6. Simple Menu Navigation{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                app/page.tsx
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            <p>
              A single slide-out menu holds all nine screens — an entry form,
              a live table and a history for each of the three lines —
              grouped under Press, Banbury and Bales headings. Signing in
              moves your own line to the top, and switching screens never
              loses whatever you were in the middle of typing.
            </p>
          </CardContent>
        </Card>

        {/* Feature 7: Production History (Past Shifts) */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <History className="w-4 h-4" />
              </div>
              7. Production History (Past Shifts){" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                ProductionHistory · BanburyHistory · BalesHistory
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              Every completed shift on every line is automatically archived,
              in its own history, so past performance can be reviewed any
              time:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  Organized by month and day:
                </strong>{" "}
                Browse past shifts in a simple, expandable list.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Full shift breakdown:
                </strong>{" "}
                Each day expands to show that line&apos;s own numbers for that
                exact shift — good/reject per table and Total Downtime on
                Press, output totals and Total Downtime on Banbury, bales and
                faulty bales on Bales — the same figures you&apos;d have seen
                live at the time.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Summary or full sheet:
                </strong>{" "}
                Each shift can be read as a totals summary or switched to the
                full entry-by-entry table, with any notes the operator left.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Day and Night shifts open independently:
                </strong>{" "}
                If both a Day and Night shift happened on the same date,
                opening one no longer forces the other closed.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Clear error messages:
                </strong>{" "}
                If history can&apos;t load for any reason, a clear warning banner
                explains that instead of just showing an empty screen.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 8: Resetting a Shift Safely */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <RotateCcw className="w-4 h-4" />
              </div>
              8. Resetting a Shift Safely{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                one reset per line
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              When a shift ends, &quot;Reset Shift Log&quot; clears that line&apos;s
              live table so the next shift starts clean. Each line resets on
              its own — clearing Banbury never touches Press or Bales:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  Already archived first:
                </strong>{" "}
                By the time you reset, that shift&apos;s data has already been
                safely saved to History — resetting only clears the live
                working table.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Double-checked before saying &quot;done&quot;:
                </strong>{" "}
                The app now verifies the clear actually happened before
                showing a success message, instead of ever showing a false
                &quot;success&quot; if something went wrong.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 9: Pick Your Own Look */}
        <Card className="bg-card border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-muted/50 border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Palette className="w-4 h-4" />
              </div>
              9. Pick Your Own Look{" "}
              <span className="font-mono text-[10px] text-muted-foreground/60 lowercase font-normal">
                components/theme/
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-muted-foreground">
            <p>
              Everyone can choose how the app looks without changing how it
              works underneath:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground font-bold">
                  9 built-in looks:
                </strong>{" "}
                From a clean, minimal paper style to a bold neon dashboard
                look — pick whichever is easiest to read on the shop floor or
                in a dim control room.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Remembers your choice:
                </strong>{" "}
                Whatever you pick stays selected on that device, even after
                closing the browser or refreshing the page.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Matches your device at first:
                </strong>{" "}
                The very first time you open the app it follows your phone or
                tablet&apos;s light/dark setting — after that, your own pick
                always wins.
              </li>
              <li>
                <strong className="text-foreground font-bold">
                  Keyboard friendly:
                </strong>{" "}
                The theme picker in the menu works with arrow keys, not just
                a mouse or touchscreen.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Contact & Collaboration / Profile Card */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-muted-foreground">
          <User className="w-3.5 h-3.5" /> Contact & Developer Profile
        </h2>
        <Card className="overflow-hidden shadow-sm border border-border/60 bg-gradient-to-b from-card to-muted/40">
          <CardContent className="p-5 space-y-5">
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Are you an engineering hiring manager looking for a versatile
              Full-Stack Web Developer with practical AI implementation skills,
              or a business owner looking to deploy optimized, zero-overhead
              automated intelligence tools onto your internal systems? Let&apos;s
              connect!
            </p>

            {/* Profile Grid */}
            <div className="p-4 bg-card border border-border/80 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider block text-muted-foreground">
                    Name
                  </span>
                  <span className="font-bold text-base text-foreground">
                    Jeric Realubit
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider block text-muted-foreground">
                    Role
                  </span>
                  <span className="font-semibold text-accent-ink">
                    Full-Stack Web Developer & AI Solutions Engineer
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>Perth, Western Australia</span>
                </div>
              </div>

              {/* Action Interactive Connectors */}
              <div className="flex flex-col justify-end gap-2 sm:pl-4 sm:border-l border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between font-medium border border-input hover:bg-accent text-foreground/80"
                  asChild
                >
                  <a
                    href="https://linkedin.com/in/jericrealubit"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-[#0A66C2] fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between font-medium border border-input hover:bg-accent text-foreground/80"
                  asChild
                >
                  <a
                    href="https://github.com/jericrealubit"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-foreground fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.0.069-.0 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        />
                      </svg>
                      GitHub
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start font-mono text-[11px] sm:text-xs border border-input hover:bg-accent text-foreground/80"
                  asChild
                >
                  <a href="tel:+61491098073">
                    <Phone className="w-4 h-4 shrink-0 mr-2 text-primary" />{" "}
                    +61 491 098 073
                  </a>
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-center font-medium text-muted-foreground">
              Open to local, hybrid, and global remote opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
