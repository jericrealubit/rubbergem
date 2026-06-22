"use client";

import { useState } from "react";
import {
  Menu,
  X,
  FileText,
  ClipboardList,
  Settings,
  ShieldAlert,
} from "lucide-react";
import ProductionForm from "@/components/PressForm";
import ProductionTablePage from "./ProductionTable";

export default function Home() {
  const [currentView, setCurrentView] = useState<"form" | "table">("form");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const navigateTo = (view: "form" | "table") => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col relative overflow-x-hidden">
      {/* Global Top Banner with Burger Menu Trigger */}
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
            RubberGem Production System
          </span>
        </div>
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
              <span>Production Log Table</span>
            </button>
          </nav>
        </div>

        {/* Menu Footer Block */}
        <div className="p-4 border-t border-neutral-800 space-y-2 text-center text-[11px] text-neutral-500 font-medium">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-neutral-600" />
            <span>Local Instance Client</span>
          </div>
          <p>© 2026 RubberGem Ltd.</p>
        </div>
      </div>

      {/* Click-Away Backdrop Overlay Mask */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Main Container View Router Frame */}
      <main className="flex-1 w-full p-2 sm:p-4">
        {currentView === "form" ? (
          <ProductionForm />
        ) : (
          <ProductionTablePage onBack={() => setCurrentView("form")} />
        )}
      </main>
    </div>
  );
}
