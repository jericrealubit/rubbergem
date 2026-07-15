import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Cpu,
  Layers,
  FileText,
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
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-6 pb-12 text-neutral-800">
      {/* Hero Header Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Cpu className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/50 text-emerald-200 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Core Infrastructure
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Rubber Production System
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-xl leading-relaxed font-medium">
            A high-performance, mobile-optimized terminal and single-page audit
            engine engineered for precise, immutable industrial shift cycle
            logging.
          </p>
        </div>
      </div>

      {/* Technical Stack Architecture Ribbon */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-neutral-400">
          <Layers className="w-3.5 h-3.5" /> Technical Stack
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              Framework
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              Next.js App Router
            </p>
          </div>
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              Database & Sync
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              Supabase Cloud DB
            </p>
          </div>
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              Styling
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              Tailwind CSS v4
            </p>
          </div>
          <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
            <p className="text-[10px] uppercase font-bold text-neutral-400">
              State & Cache
            </p>
            <p className="text-xs font-bold mt-0.5 text-neutral-800">
              React Context & Local
            </p>
          </div>
        </div>
      </div>

      {/* Main Application Modules */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-1 text-neutral-400">
          <Layers className="w-3.5 h-3.5" /> System Architecture & Features
        </h2>

        {/* Feature 1: Mobile Fast-Entry Terminal */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Smartphone className="w-4 h-4" />
              </div>
              1. Mobile Fast-Entry Terminal{" "}
              <span className="font-mono text-[11px] text-neutral-400 lowercase font-normal">
                (/components/PressForm.tsx)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              Designed explicitly for high-efficiency operation on the
              production floor with minimal data-entry friction:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Dynamic Header Switcher:
                </strong>{" "}
                Instantly toggles runtime configuration tracking between{" "}
                <span className="font-semibold text-neutral-900">Press #1</span>{" "}
                and{" "}
                <span className="font-semibold text-neutral-900">Press #2</span>{" "}
                on-the-fly.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Collapsible Shift Panel:
                </strong>{" "}
                Keeps the interface clean on small mobile viewports, displaying
                a real-time summary string fallback (
                <span className="italic font-medium text-neutral-700">
                  Operator • Shift • Date
                </span>
                ) when hidden.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Smart Timestamps Engine:
                </strong>{" "}
                One-tap cycle logs with automated duration parsing. Integrates
                complex{" "}
                <span className="font-semibold text-emerald-800">
                  midnight-crossover protection
                </span>{" "}
                (e.g., a cycle logged from 23:55 to 00:20 calculates flawlessly
                as 25 minutes instead of throwing negative values).
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Geometric Matrix Mapping:
                </strong>{" "}
                Replicates physical sheets using custom absolute coordinate
                radios in an{" "}
                <span className="font-semibold text-neutral-800">
                  X-pattern alignment
                </span>{" "}
                to log table short molds, matched with multi-select checkbox
                arrays tracking positional micro-bubbles (
                <span className="italic text-neutral-700">
                  Left, Middle, Right
                </span>
                ) and sizing dimensions.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 2: Supabase Cloud Integration */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Database className="w-4 h-4" />
              </div>
              2. Real-Time Supabase Cloud Sync{" "}
              <span className="font-mono text-[11px] text-neutral-400 lowercase font-normal">
                (database schema & pipelines)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              Synchronizes local runtime sessions directly with global Postgres
              cloud nodes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Cloud Live Logging:
                </strong>{" "}
                Dispatches secure, structured cycle payloads to the database,
                ensuring zero lag on submission.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Structured JSON Payloads:
                </strong>{" "}
                Packs detailed rejection metrics, target bubble sizes, and
                coordinates into clean JSON payloads for flexible and
                lightweight data reporting.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 3: Authentication & Security */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldAlert className="w-4 h-4" />
              </div>
              3. Session Authentication Controls{" "}
              <span className="font-mono text-[11px] text-neutral-400 lowercase font-normal">
                (Supabase Auth integration)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              Restricts floor inputs and logs to authorized operator accounts to
              prevent data contamination:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Submission Locks:
                </strong>{" "}
                Prevents workspace writes unless an active session is
                established.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Session Verification Warners:
                </strong>{" "}
                Fires responsive UX indicators showing authorization warnings
                when an session drops, keeping metrics airtight.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 4: Local Cache and Historical Timeline */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <History className="w-4 h-4" />
              </div>
              4. Historical Production Timeline{" "}
              <span className="font-mono text-[11px] text-neutral-400 lowercase font-normal">
                (local cache feed)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              Applies client-side workspace caching safeguards to preserve logs
              against sudden power loss:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Storage Caching:
                </strong>{" "}
                Backs up ongoing form metrics, active parameters, and runtime
                progress state seamlessly in local browser sandboxes.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Collapsible Feed Logs:
                </strong>{" "}
                Presents historical shift logs within collapsible visual list
                panels for quick terminal lookups.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 5: Single-Page Audit Dashboard Sheet */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              5. Single-Page Audit Dashboard Sheet{" "}
              <span className="font-mono text-[11px] text-neutral-400 lowercase font-normal">
                (/app/ProductionTable.tsx)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm space-y-3 leading-relaxed text-neutral-600">
            <p>
              Optimized to aggregate data blocks into physical and digital
              records structured cleanly for auditing:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-neutral-800 font-bold">
                  Parameter Extraction:
                </strong>{" "}
                Isolates metadata parameters to a singular card component at the
                top, standardizing the document format so shift details appear
                exactly once per sheet.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  15-Row Immutable Frame Grid:
                </strong>{" "}
                Guarantees layout structural uniformity by locking the matrix
                view to exactly 15 indexed blocks. Active cycles populate
                sequentially, while remaining slots automatically fall back to
                balanced placeholder alignments.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Strict Boundary Analytics:
                </strong>{" "}
                Automates cumulative reject math, enforcing a strict constraint
                limiting reporting to a maximum of 1 reject count per table per
                cycle frame, regardless of overlapping defect combinations.
              </li>
              <li>
                <strong className="text-neutral-800 font-bold">
                  Landscape Print Automation:
                </strong>{" "}
                Embedded CSS media injection completely overrides browser frames
                during compilation. It strips navigational elements and
                perfectly auto-scales table data cells to force-fit the complete
                15-cycle log seamlessly onto a single landscape sheet or
                zero-overhead PDF export.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Feature 6: Shell State Navigation Router */}
        <Card className="bg-white border border-neutral-200/60 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-neutral-50/50 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold uppercase text-emerald-900 tracking-wide flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <FileText className="w-4 h-4" />
              </div>
              6. Shell State Navigation Router{" "}
              <span className="font-mono text-[11px] text-neutral-400 lowercase font-normal">
                (/app/page.tsx)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:text-sm leading-relaxed text-neutral-600">
            <p>
              Orchestrates client-side state transfers through a smooth,
              responsive sliding drawer UI masked with a backdrop overlay
              filter. This shell design enables operators to navigate seamlessly
              between active terminal entries and the historical log tables
              without causing temporary context state or form data loss.
            </p>
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
              automated intelligence tools onto your internal systems? Let's
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
                  <span className="font-semibold text-emerald-800">
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
