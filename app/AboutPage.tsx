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
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full max-w-3xl ipad:max-w-4xl mx-auto p-4 ipad:p-6 space-y-6 pb-12 text-neutral-800">
      {/* Hero Header Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Cpu className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/50 text-emerald-200 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> About This App
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Rubber — Shift Logging Made Simple
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl leading-relaxed font-medium">
            A simple app operators use on the shop floor to record every press
            cycle, defect, and downtime as it happens — so shift records stay
            accurate and the boss can see real production numbers without
            walking the floor.
          </p>
        </div>
      </div>

      {/* Technical Stack Architecture Ribbon */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-neutral-400">
          <Layers className="w-3.5 h-3.5" /> Built With
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              Framework
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              Next.js
            </p>
            <p className="text-[10px] mt-1 text-neutral-500 leading-snug">
              The engine that makes the app fast and reliable on any device.
            </p>
          </div>
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              Database & Sync
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              Supabase
            </p>
            <p className="text-[10px] mt-1 text-neutral-500 leading-snug">
              Where shift data is safely stored and shared instantly across
              devices.
            </p>
          </div>
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              Styling
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              Tailwind CSS
            </p>
            <p className="text-[10px] mt-1 text-neutral-500 leading-snug">
              Keeps the app looking clean and working well on phones and
              tablets.
            </p>
          </div>
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              State & Cache
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              Local Browser Storage
            </p>
            <p className="text-[10px] mt-1 text-neutral-500 leading-snug">
              Remembers what you were typing even if the page refreshes.
            </p>
          </div>
        </div>
      </div>

      {/* Main Application Modules */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-neutral-400">
          <Layers className="w-3.5 h-3.5" /> How the System Works
        </h2>

        {/* Feature 1: Quick Entry Form */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Smartphone className="w-4 h-4" />
              </div>
              1. Quick Entry Form{" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                components/PressForm.tsx
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>What the operator fills in on the floor, one cycle at a time:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Switch presses in one tap:
                </strong>{" "}
                Jump between{" "}
                <span className="font-semibold text-neutral-900">Press #1</span>{" "}
                and{" "}
                <span className="font-semibold text-neutral-900">Press #2</span>{" "}
                instantly.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Stays out of the way:
                </strong>{" "}
                The shift details panel (operator, shift, date) can be
                collapsed to keep the screen clean on a phone, while still
                showing a short summary so you always know what&apos;s set.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Does the time math for you:
                </strong>{" "}
                Just enter a start and end time — the app works out how long
                the cycle took automatically, even across midnight (a cycle
                from 11:55pm to 12:20am is correctly counted as 25 minutes,
                not a negative number).
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Mark defects on a diagram:
                </strong>{" "}
                Tap the exact spot on an on-screen diagram (matching the real
                sheet layout) to record a short mold, and check off bubble
                defects by position (
                <span className="italic text-neutral-700">
                  Left, Middle, Right
                </span>
                ) and size.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Can&apos;t accidentally double-submit:
                </strong>{" "}
                The Submit button locks itself while an entry is saving, so a
                double-tap can&apos;t create two records for the same cycle.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 2: Saves Instantly to the Cloud */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Database className="w-4 h-4" />
              </div>
              2. Saves Instantly to the Cloud{" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                Supabase database
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              Every cycle you submit is sent straight to a secure online
              database — nothing lives only on the terminal:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  No waiting, no lost entries:
                </strong>{" "}
                Cycle data is saved the moment you submit, so it&apos;s safe even
                if the terminal is turned off right after.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Everything stays together:
                </strong>{" "}
                Reject details, bubble sizes, and positions are all saved as
                one record, so nothing gets mixed up between cycles.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 3: Only Logged-In Operators Can Make Changes */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <ShieldAlert className="w-4 h-4" />
              </div>
              3. Only Logged-In Operators Can Make Changes{" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                Supabase Auth
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              This keeps the records trustworthy — anyone can view the live
              board, but only signed-in operators can change it:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Editing requires login:
                </strong>{" "}
                Submitting a cycle, changing shift settings, or resetting the
                log all require an active, logged-in session.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Clear warnings, not silent failures:
                </strong>{" "}
                If your session drops, the app shows you a clear warning
                instead of quietly failing to save.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 4: Nothing Is Lost If the Page Closes */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Save className="w-4 h-4" />
              </div>
              4. Nothing Is Lost If the Page Closes{" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                local browser backup
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              A safety net for accidental refreshes, closed tabs, or a
              terminal that loses power mid-entry:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Auto-backup while you type:
                </strong>{" "}
                Whatever you&apos;re filling in — times, defect selections, notes —
                is quietly backed up on that device as you go.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Recently logged cycles:
                </strong>{" "}
                Kept in a simple, browsable list for quick reference on the
                terminal.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 5: The Live Shift Log Table */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              5. The Live Shift Log Table{" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                app/ProductionTable.tsx
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              The audit sheet the whole shift&apos;s cycles get logged onto,
              designed to print cleanly:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Shift details shown once:
                </strong>{" "}
                Operator, press, and date appear in one card at the top
                instead of being repeated on every row.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Always 15 rows:
                </strong>{" "}
                The sheet always shows exactly 15 rows, whether the shift had
                3 cycles or 15, so every printed sheet looks the same and
                fits one page.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Fair reject counting:
                </strong>{" "}
                A cycle only ever counts as one reject per table, even if it
                has more than one type of defect — so the numbers can&apos;t be
                double-counted.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Runtime column:
                </strong>{" "}
                Records the target run time that was set at the moment each
                cycle was logged, permanently — so if the target gets changed
                later in the shift, earlier rows still show what was actually
                true when they happened.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Total Downtime (default: 17m):
                </strong>{" "}
                Automatically adds up, across the whole shift, how many extra
                minutes were spent loading/unloading beyond the standard
                17-minute target — shown in red so it stands out at a glance.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  One-tap PDF/print:
                </strong>{" "}
                &quot;Print PDF&quot; automatically formats the full 15-row sheet to
                fit neatly on a single landscape page.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 6: Simple Menu Navigation */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <Menu className="w-4 h-4" />
              </div>
              6. Simple Menu Navigation{" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                app/page.tsx
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm leading-relaxed text-neutral-600">
            <p>
              A single slide-out menu lets you move between the entry form,
              the live shift table, and shift history — without losing
              whatever you were in the middle of typing.
            </p>
          </CardContent>
        </Card>

        {/* Feature 7: Production History (Past Shifts) */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <History className="w-4 h-4" />
              </div>
              7. Production History (Past Shifts){" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                components/ProductionHistory.tsx
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              Every completed shift is automatically archived so past
              performance can be reviewed any time:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Organized by month and day:
                </strong>{" "}
                Browse past shifts in a simple, expandable list.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Full shift breakdown:
                </strong>{" "}
                Each day expands to show good/reject counts per table, plus
                Accumulated Load Time and Total Downtime for that exact
                shift — the same numbers you&apos;d have seen live at the time.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Day and Night shifts open independently:
                </strong>{" "}
                If both a Day and Night shift happened on the same date,
                opening one no longer forces the other closed.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Clear error messages:
                </strong>{" "}
                If history can&apos;t load for any reason, a clear warning banner
                explains that instead of just showing an empty screen.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 8: Resetting a Shift Safely */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-accent-ink tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-chip text-accent-ink">
                <RotateCcw className="w-4 h-4" />
              </div>
              8. Resetting a Shift Safely{" "}
              <span className="font-mono text-[10px] text-neutral-300 lowercase font-normal">
                app/ProductionTable.tsx
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              When a shift ends, &quot;Reset Shift Log&quot; clears the live table so
              the next shift starts clean:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Already archived first:
                </strong>{" "}
                By the time you reset, that shift&apos;s data has already been
                safely saved to History — resetting only clears the live
                working table.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Double-checked before saying &quot;done&quot;:
                </strong>{" "}
                The app now verifies the clear actually happened before
                showing a success message, instead of ever showing a false
                &quot;success&quot; if something went wrong.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Contact & Collaboration / Profile Card */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-neutral-400">
          <User className="w-3.5 h-3.5" /> Contact & Developer Profile
        </h2>
        <Card className="overflow-hidden shadow-sm border border-neutral-200/60 bg-gradient-to-b from-white to-neutral-50/40">
          <CardContent className="p-5 space-y-5">
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-600">
              Are you an engineering hiring manager looking for a versatile
              Full-Stack Web Developer with practical AI implementation skills,
              or a business owner looking to deploy optimized, zero-overhead
              automated intelligence tools onto your internal systems? Let&apos;s
              connect!
            </p>

            {/* Profile Grid */}
            <div className="p-4 bg-white border border-neutral-200/80 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider block text-neutral-400">
                    Name
                  </span>
                  <span className="font-bold text-base text-neutral-900">
                    Jeric Realubit
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider block text-neutral-400">
                    Role
                  </span>
                  <span className="font-semibold text-accent-ink">
                    Full-Stack Web Developer & AI Solutions Engineer
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  <span>Perth, Western Australia</span>
                </div>
              </div>

              {/* Action Interactive Connectors */}
              <div className="flex flex-col justify-end gap-2 sm:pl-4 sm:border-l border-neutral-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between font-medium border border-neutral-300 hover:bg-neutral-50 text-neutral-700"
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
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between font-medium border border-neutral-300 hover:bg-neutral-50 text-neutral-700"
                  asChild
                >
                  <a
                    href="https://github.com/jericrealubit"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-neutral-900 fill-current"
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
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start font-mono text-[11px] sm:text-xs border border-neutral-300 hover:bg-neutral-50 text-neutral-700"
                  asChild
                >
                  <a href="tel:+61491098073">
                    <Phone className="w-4 h-4 shrink-0 mr-2 text-emerald-600" />{" "}
                    +61 491 098 073
                  </a>
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-center font-medium text-neutral-400">
              Open to local, hybrid, and global remote opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
