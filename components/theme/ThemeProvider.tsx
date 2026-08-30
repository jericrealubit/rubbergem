"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  STORAGE_KEY,
  THEME_CATEGORY,
  THEME_COLORS,
  isThemeId,
  type ThemeCategory,
  type ThemeId,
} from "./theme-config";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  resolvedCategory: ThemeCategory;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystemDefault(): ThemeId {
  if (typeof window === "undefined" || !window.matchMedia) {
    return DEFAULT_LIGHT_THEME;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DEFAULT_DARK_THEME
    : DEFAULT_LIGHT_THEME;
}

/**
 * Reads the theme already committed to the DOM by the blocking inline
 * script in app/layout.tsx. On the client this is the real resolved theme
 * (script runs before hydration); on the server/build it's always the
 * DEFAULT_LIGHT_THEME fallback, matching this file's static-export prerender.
 * The one-render gap this can cause in descendants that read `theme` during
 * render (only components/theme/ThemeSwitcher.tsx does) is intentionally
 * suppressed there via suppressHydrationWarning, rather than deferring
 * resolution to a post-mount effect — that would otherwise let the DOM
 * attribute effect below briefly re-apply the stale default after hydration.
 */
function readInitialTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_LIGHT_THEME;
  const attr = document.documentElement.getAttribute("data-theme");
  return isThemeId(attr) ? attr : resolveSystemDefault();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, resolvedCategory: THEME_CATEGORY[theme] }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return ctx;
}
