export type ThemeId =
  | "classic"
  | "editorial-minimal"
  | "dark-glass"
  | "organic-wellness"
  | "cobalt-brutalist"
  | "soft-3d"
  | "retro-future"
  | "neutral-elegance"
  | "tropical-jade-sunrise";

export type ThemeCategory = "light" | "dark";

export const THEMES: { id: ThemeId; label: string; category: ThemeCategory }[] = [
  { id: "classic", label: "Classic", category: "light" },
  { id: "editorial-minimal", label: "Editorial Minimal", category: "light" },
  { id: "dark-glass", label: "Dark Glass", category: "dark" },
  { id: "organic-wellness", label: "Organic Wellness", category: "light" },
  { id: "cobalt-brutalist", label: "Cobalt Brutalist", category: "light" },
  { id: "soft-3d", label: "Soft 3D", category: "light" },
  { id: "retro-future", label: "Retro Future", category: "dark" },
  { id: "neutral-elegance", label: "Neutral Elegance", category: "light" },
  { id: "tropical-jade-sunrise", label: "Tropical Jade Sunrise", category: "light" },
];

export const THEME_IDS: ThemeId[] = THEMES.map((t) => t.id);

export const THEME_CATEGORY: Record<ThemeId, ThemeCategory> = THEMES.reduce(
  (acc, t) => ({ ...acc, [t.id]: t.category }),
  {} as Record<ThemeId, ThemeCategory>
);

// Used for the browser-chrome `<meta name="theme-color">` tag — kept in sync
// with each theme's --background value in app/globals.css.
export const THEME_COLORS: Record<ThemeId, string> = {
  classic: "#f7f7f7",
  "editorial-minimal": "#f5f3ee",
  "dark-glass": "#0c0f1a",
  "organic-wellness": "#f5f0e3",
  "cobalt-brutalist": "#ffffff",
  "soft-3d": "#e8e2f2",
  "retro-future": "#0c0a08",
  "neutral-elegance": "#faf6f2",
  "tropical-jade-sunrise": "#fdf6e3",
};

export const STORAGE_KEY = "app-theme";

// Used only when no explicit localStorage choice exists yet — the initial
// default follows system dark/light preference; the user's explicit pick
// always takes priority thereafter (never overwritten by a later system
// preference change).
export const DEFAULT_DARK_THEME: ThemeId = "dark-glass";
export const DEFAULT_LIGHT_THEME: ThemeId = "classic";

export function isThemeId(value: string | null): value is ThemeId {
  return !!value && (THEME_IDS as string[]).includes(value);
}

/** The inline, pre-hydration FOUC-prevention script (see app/layout.tsx). */
export function buildThemeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(STORAGE_KEY)};var ids=${JSON.stringify(
    THEME_IDS
  )};var colors=${JSON.stringify(THEME_COLORS)};var s=localStorage.getItem(k);var t=s&&ids.indexOf(s)!==-1?s:null;if(!t){var d=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;t=d?${JSON.stringify(
    DEFAULT_DARK_THEME
  )}:${JSON.stringify(
    DEFAULT_LIGHT_THEME
  )};}document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m&&colors[t])m.setAttribute("content",colors[t]);}catch(e){}})();`;
}
