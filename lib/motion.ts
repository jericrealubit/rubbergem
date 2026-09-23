import { useMemo } from "react";
import type { Transition, TargetAndTransition, Variants } from "framer-motion";
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

/**
 * Deterministic 0..1 phase derived from a string seed (e.g. an icon's
 * displayName), so multiple IdleIcon instances desync from each other
 * instead of all breathing in lockstep — a wall of icons pulsing in unison
 * reads as mechanical/distracting; staggered, it reads as "alive". Not
 * cryptographic, just a cheap deterministic spread.
 */
function phaseFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 100) / 100;
}

/**
 * Builds the animate/transition pair for a continuously-looping "breathing"
 * icon — ambient/idle motion, not gated by user interaction. `active` icons
 * get the theme's full idle amplitude; inactive icons use a deliberately
 * smaller one, so a whole icon list reads as "alive" without competing with
 * the active item (see theme-config.ts's `MotionPreset.idle`).
 *
 * Deliberately scale-only (no opacity): framer-motion's `reducedMotion`
 * config (see ThemeProvider.tsx's `<MotionConfig reducedMotion="user">`)
 * only disables transform-based animation, not opacity — so an opacity loop
 * here would keep running under prefers-reduced-motion, when nothing else
 * looping in this app does. Keeping this scale-only means the existing
 * app-wide MotionConfig fully covers it with zero per-component checks.
 */
export function idleBreathe(
  preset: MotionPreset,
  active: boolean,
  seed = ""
): { animate: TargetAndTransition; transition: Transition } {
  const { idle } = preset;
  const scale = active ? idle.activeScale : idle.inactiveScale;
  return {
    animate: { scale: [1, scale, 1] },
    transition: {
      duration: idle.duration,
      repeat: Infinity,
      ease: idle.ease,
      delay: phaseFromSeed(seed) * idle.duration,
    },
  };
}
