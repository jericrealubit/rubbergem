import { useMemo } from "react";
import type { Transition, Variants } from "framer-motion";
import { MOTION_PRESETS, type MotionPreset } from "@/components/theme/theme-config";
import { useThemeContext } from "@/components/theme/ThemeProvider";

/** The active theme's motion personality (spring stiffness/damping, durations). */
export function useMotionPreset(): MotionPreset {
  const { theme } = useThemeContext();
  return MOTION_PRESETS[theme];
}

/** A ready-to-spread framer-motion spring transition for the active theme. */
export function useThemeSpring(): Transition {
  const preset = useMotionPreset();
  return useMemo(
    () => ({ type: "spring" as const, ...preset.spring }),
    [preset]
  );
}

/** Fade + small upward translate — the default entrance for most content. */
export const fadeSlideIn: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Fast fade + tiny translate, sized for whole-view swaps (snappy, not sluggish). */
export const viewTransition: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

/** Auto-measured height collapse/expand for cards and accordions. */
export const collapseHeight: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

/** Spring pop-in, for badges/success icons/selected states. */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.6 },
};

/** Stagger wrapper for lists of children using fadeSlideIn/popIn. */
export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.04 } },
};
