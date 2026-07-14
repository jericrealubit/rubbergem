"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
import ProductionForm from "@/components/PressForm";
import ProductionTablePage from "./ProductionTable";
import ProductionHistory from "@/components/ProductionHistory";
import AboutPage from "./AboutPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ViewType = "form" | "table" | "history" | "about";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>("form");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // --- LIFTED TIMER GLOBAL STATE ---
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

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

  // --- GLOBAL TIMER COUNTDOWN EFFECT ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Handler passed down to the form trigger (automatically subtracts 3 minutes)
  const handleStartTimer = (minutes: number) => {
    const adjustedMinutes = Math.max(0, minutes - 3);
    if (adjustedMinutes > 0) {
      setTimeLeft(adjustedMinutes * 60);
      setIsTimerActive(true);
    } else {
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

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col relative overflow-x-hidden">
      {/* Global Top Header with Persistent Countdown Timer */}
      <header className="bg-emerald-950 text-white h-14 px-4 flex items-center justify-between shadow-md z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-emerald-900/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Toggle Navigation Menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <span className="font-bold tracking-wide uppercase text-sm md:text-base">
            Production System
          </span>
        </div>

        {/* Global Timer Placement Area */}
        {isTimerActive && (
          <div className="flex items-center gap-2 bg-emerald-900/40 border border-emerald-800/50 px-2.5 py-1 rounded-xl shadow-inner select-none animate-fade-in z-50">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider hidden sm:inline">
              Cycle Time:
            </span>
            <div className="font-mono text-sm font-black tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-800/30 min-w-[55px] text-center">
              {formatTime(timeLeft)}
            </div>
            <button
              type="button"
              onClick={() => setIsTimerActive(false)}
              className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-red-400 border border-neutral-800/80 hover:border-red-950 px-1.5 py-0.5 rounded bg-emerald-950/40 transition-all active:scale-95"
            >
              Skip
            </button>
          </div>
        )}
      </header>

      {/* Slide-out Burger Menu Navigation Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-neutral-900 text-neutral-200 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl pt-14 flex flex-col justify-between ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-6">
          <div className="border-b border-neutral-800 pb-3">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
              Navigation
            </p>
          </div>
          <nav className="space-y-1.5">
            <button
              onClick={() => navigateTo("form")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === "form"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>Press Entry Form</span>
            </button>

            <button
              onClick={() => navigateTo("table")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === "table"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Press Live Log Table</span>
            </button>

            <button
              onClick={() => navigateTo("history")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === "history"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Press History</span>
            </button>

            <button
              onClick={() => navigateTo("about")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                currentView === "about"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>About System</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-800 space-y-2">
          {session ? (
            <div className="text-center space-y-2">
              <p className="text-[10px] text-emerald-500 font-bold truncate">
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
                <Button className="w-full bg-emerald-700 hover:bg-emerald-600">
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
      </div>

      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Main Container View Frame */}
      <main className="flex-1 w-full p-2 sm:p-4">
        {currentView === "form" && (
          <ProductionForm session={session} onStartTimer={handleStartTimer} />
        )}

        {currentView === "table" && (
          <ProductionTablePage
            onBack={() => setCurrentView("form")}
            session={session}
          />
        )}

        {currentView === "history" && <ProductionHistory />}

        {currentView === "about" && <AboutPage />}
      </main>
    </div>
  );
}
