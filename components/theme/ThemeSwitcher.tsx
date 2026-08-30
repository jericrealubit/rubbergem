"use client";

import { useRef, type KeyboardEvent } from "react";
import { THEMES } from "./theme-config";
import { useThemeContext } from "./ThemeProvider";

/**
 * Global theme picker: a WAI-ARIA radio group so arrow keys move focus/
 * selection between the six themes. Each swatch is a real, tiny
 * `data-theme="<id>"`-scoped element — since CSS custom properties inherit
 * down the DOM regardless of which element carries the `data-theme`
 * attribute, `var(--background)`/`var(--primary)` inside that scope always
 * resolve to *that* theme's own colors, not whichever theme is currently
 * active on <html>. No separate hard-coded color lookup table needed.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeContext();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusIndex(index: number) {
    const len = THEMES.length;
    const next = ((index % len) + len) % len;
    buttonRefs.current[next]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusIndex(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusIndex(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusIndex(0);
        break;
      case "End":
        e.preventDefault();
        focusIndex(THEMES.length - 1);
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-3 gap-2"
    >
      {THEMES.map((t, index) => {
        const checked = theme === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            suppressHydrationWarning
            tabIndex={checked ? 0 : -1}
            onClick={() => setTheme(t.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            title={t.label}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--chrome-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--drawer-bg)] ${
              checked
                ? "border-[var(--chrome-accent)] bg-[var(--drawer-hover-bg)]"
                : "border-transparent hover:bg-[var(--drawer-hover-bg)]"
            }`}
          >
            <span
              data-theme={t.id}
              aria-hidden="true"
              className="relative inline-block w-6 h-6 rounded-full border shrink-0"
              style={{
                background: "var(--background)",
                borderColor: "var(--border)",
              }}
            >
              <span
                className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2"
                style={{
                  background: "var(--primary)",
                  borderColor: "var(--background)",
                }}
              />
            </span>
            <span className="text-[9px] font-semibold text-[var(--drawer-text-muted)] text-center leading-tight">
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
