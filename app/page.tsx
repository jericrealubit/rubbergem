"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useMotionPreset, useThemeSpring, viewTransition } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Menu,
  X,
  FileText,
  ClipboardList,
  History,
  HelpCircle,
  Boxes,
  Table2,
  FlaskConical,
  ListChecks,
} from "lucide-react";
import ProductionForm from "@/components/PressForm";
import ProductionTablePage from "./ProductionTable";
import ProductionHistory from "@/components/ProductionHistory";
import AboutPage from "./AboutPage";
import ChatPanel from "@/components/ChatPanel";
import BalesForm from "@/components/BalesForm";
import BalesProductionTable from "./BalesProductionTable";
import BalesHistory from "@/components/BalesHistory";
import BanburyForm from "@/components/BanburyForm";
import BanburyTablePage from "./BanburyTable";
import BanburyHistory from "@/components/BanburyHistory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { activeLineFor, type LineKey } from "@/lib/line-accounts";

type ViewType =
  | "form"
  | "table"
  | "history"
  | "about"
  | "balesForm"
  | "balesTable"
  | "balesHistory"
  | "banburyForm"
  | "banburyTable"
  | "banburyHistory";

// One entry per production line's login account -- app/page.tsx reorders
// these so whichever account is logged in shows first in the burger menu
// (see lib/line-accounts.ts / PressForm.tsx / BalesForm.tsx / BanburyForm.tsx's
// matching isAuthorized gates).
const NAV_SECTIONS: {
  key: LineKey;
  label: string;
  items: { view: ViewType; label: string; icon: typeof FileText }[];
}[] = [
  {
    key: "press",
    label: "Press",
    items: [
      { view: "form", label: "Press Entry Form", icon: ClipboardList },
      { view: "table", label: "Press Live Log Table", icon: FileText },
      { view: "history", label: "Press History", icon: History },
    ],
  },
  {
    key: "bales",
    label: "Bales",
    items: [
      { view: "balesForm", label: "Bales Entry Form", icon: Boxes },
      { view: "balesTable", label: "Bales Live Log Table", icon: Table2 },
      { view: "balesHistory", label: "Bales History", icon: History },
    ],
  },
  {
    key: "banbury",
    label: "Banbury",
    items: [
      { view: "banburyForm", label: "Banbury Entry Form", icon: FlaskConical },
      { view: "banburyTable", label: "Banbury Live Log Table", icon: ListChecks },
      { view: "banburyHistory", label: "Banbury History", icon: History },
    ],
  },
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>("form");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const motionPreset = useMotionPreset();
  const spring = useThemeSpring();

  // --- MOBILE-SAFE LIFTED TIMER STATE ---
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [endTime, setEndTime] = useState<number | null>(null); // Real-world target timestamp

  // 1. Listen for Auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- MOBILE-RESILIENT TIMER SYNC EFFECT ---
  useEffect(() => {
    if (!isTimerActive || !endTime) return;

    const updateTimer = () => {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft(0);
        setIsTimerActive(false);
        setEndTime(null);
      } else {
        // Round up so 59.1s shows as 01:00 or 00:59 correctly
        setTimeLeft(Math.ceil(remainingMs / 1000));
      }
    };

    // Run calculation immediately
    updateTimer();

    // Standard interval to update screen every second while active
    const interval = setInterval(updateTimer, 1000);

    // CRITICAL: When phone wakes up/unlocks, immediately catch up to real-world time
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isTimerActive, endTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Start handler (Calculates absolute end target & subtracts 3 minutes)
  const handleStartTimer = (minutes: number) => {
    const adjustedMinutes = Math.max(0, minutes - 3);
    if (adjustedMinutes > 0) {
      const targetEndTime = Date.now() + adjustedMinutes * 60 * 1000;
      setEndTime(targetEndTime);
      setTimeLeft(adjustedMinutes * 60);
      setIsTimerActive(true);
    } else {
      setEndTime(null);
      setTimeLeft(0);
      setIsTimerActive(false);
    }
  };

  // 2. Auth Handlers
  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  // Whichever line's account is logged in gets its nav section moved to the
  // top of the burger menu; logged out (or a non-line account) keeps the
  // default Press/Bales/Banbury order.
  const activeLine = activeLineFor(session?.user?.email);
  const orderedNavSections = activeLine
    ? [
        ...NAV_SECTIONS.filter((s) => s.key === activeLine),
        ...NAV_SECTIONS.filter((s) => s.key !== activeLine),
      ]
    : NAV_SECTIONS;

  function renderView(view: ViewType) {
    switch (view) {
      case "form":
        return (
          <ProductionForm
            session={session}
            onStartTimer={handleStartTimer}
            onNavigateToTable={() => navigateTo("table")}
          />
        );
      case "table":
        return (
          <ProductionTablePage
            onBack={() => setCurrentView("form")}
            session={session}
          />
        );
      case "history":
        return <ProductionHistory />;
      case "about":
        return <AboutPage />;
      case "balesForm":
        return (
          <BalesForm
            session={session}
            onNavigateToTable={() => navigateTo("balesTable")}
          />
        );
      case "balesTable":
        return (
          <BalesProductionTable
            onBack={() => setCurrentView("balesForm")}
            session={session}
          />
        );
      case "balesHistory":
        return <BalesHistory />;
      case "banburyForm":
        return (
          <BanburyForm
            session={session}
            onNavigateToTable={() => navigateTo("banburyTable")}
          />
        );
      case "banburyTable":
        return (
          <BanburyTablePage
            onBack={() => setCurrentView("banburyForm")}
            session={session}
          />
        );
      case "banburyHistory":
        return <BanburyHistory />;
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {/* Global Top Header with Persistent Countdown Timer */}
      <header className="bg-[var(--chrome-bg)] text-[var(--chrome-text)] h-14 px-4 flex items-center justify-between shadow-md z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-[var(--chrome-bg-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--chrome-accent)]"
            aria-label="Toggle Navigation Menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMenuOpen ? "x" : "menu"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={spring}
                className="inline-flex"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>
          <span className="font-bold tracking-wide uppercase text-sm md:text-base">
            Rubber Production System
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ChatPanel session={session} />

          {/* Global Timer Placement Area */}
          <AnimatePresence>
            {isTimerActive && (
              <motion.div
                key="timer-pill"
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={spring}
                className="flex items-center gap-2 bg-[var(--chrome-bg-hover)] border border-[var(--chrome-border)] px-2.5 py-1 rounded-xl shadow-inner select-none z-50"
              >
                <span className="text-[10px] font-bold text-[var(--chrome-accent)] uppercase tracking-wider hidden sm:inline">
                  Cycle Time:
                </span>
                <div className="font-mono text-sm font-black tracking-widest text-[var(--chrome-accent)] bg-[var(--chrome-bg)]/80 px-2.5 py-0.5 rounded-lg border border-[var(--chrome-border)] min-w-[55px] text-center">
                  {formatTime(timeLeft)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTimerActive(false);
                    setEndTime(null);
                  }}
                  className="text-[9px] font-bold uppercase tracking-widest text-[var(--chrome-text-muted)] hover:text-destructive border border-[var(--chrome-border)] hover:border-destructive px-1.5 py-0.5 rounded bg-[var(--chrome-bg)]/40 transition-all active:scale-95"
                >
                  Skip
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Slide-out Burger Menu Navigation Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              key="drawer-backdrop"
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionPreset.duration.base }}
            />
            <motion.div
              key="drawer"
              className="fixed inset-y-0 left-0 w-64 bg-[var(--drawer-bg)] text-[var(--drawer-text)] z-50 shadow-2xl pt-14 flex flex-col justify-between"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={spring}
            >
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
                <div className="border-b border-[var(--chrome-border)] pb-3">
                  <p className="text-xs font-bold text-[var(--drawer-text-muted)] uppercase tracking-widest">
                    Navigation
                  </p>
                </div>
                <nav className="space-y-1.5">
                  {orderedNavSections.map((section, sectionIndex) => (
                    <div key={section.key}>
                      <div
                        className={
                          sectionIndex > 0
                            ? "pt-2 mt-2 border-t border-[var(--chrome-border)]"
                            : ""
                        }
                      >
                        <p className="px-3 pb-1.5 text-[10px] font-bold text-[var(--drawer-text-muted)] uppercase tracking-widest">
                          {section.label}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {section.items.map((item) => {
                          const active = currentView === item.view;
                          return (
                            <button
                              key={item.view}
                              onClick={() => navigateTo(item.view)}
                              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                active
                                  ? "text-primary-foreground"
                                  : "hover:bg-[var(--drawer-hover-bg)] text-[var(--drawer-text-muted)] hover:text-[var(--drawer-text)]"
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId="nav-active-pill"
                                  transition={spring}
                                  className="absolute inset-0 rounded-lg bg-primary shadow-sm -z-10"
                                />
                              )}
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="pt-2 border-t border-[var(--chrome-border)] space-y-2">
                  <p className="text-[10px] font-bold text-[var(--drawer-text-muted)] uppercase tracking-widest">
                    Appearance
                  </p>
                  <ThemeSwitcher />
                </div>

                <div className="pt-2 border-t border-[var(--chrome-border)]" />

                <button
                  onClick={() => navigateTo("about")}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    currentView === "about"
                      ? "text-primary-foreground"
                      : "hover:bg-[var(--drawer-hover-bg)] text-[var(--drawer-text-muted)] hover:text-[var(--drawer-text)]"
                  }`}
                >
                  {currentView === "about" && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={spring}
                      className="absolute inset-0 rounded-lg bg-primary shadow-sm -z-10"
                    />
                  )}
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>About System</span>
                </button>
              </div>

              <div className="shrink-0 p-4 border-t border-[var(--chrome-border)] space-y-2">
                {session ? (
                  <div className="text-center space-y-2">
                    <p className="text-[10px] text-[var(--chrome-accent)] font-bold truncate">
                      {session.user.email}
                    </p>
                    <Button
                      onClick={handleLogout}
                      variant="destructive"
                      className="w-full h-8 text-xs"
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        Login to System
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[300px]">
                      <DialogHeader>
                        <DialogTitle>Operator Login</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          placeholder="Email"
                          type="email"
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                          placeholder="Password"
                          type="password"
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                          onClick={handleLogin}
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? "Signing in..." : "Sign In"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Container View Frame */}
      <main className="flex-1 w-full p-2 sm:p-4 ipad:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={viewTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: motionPreset.duration.fast }}
          >
            {renderView(currentView)}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
