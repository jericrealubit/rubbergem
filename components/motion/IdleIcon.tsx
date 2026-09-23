"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useMotionPreset, idleBreathe } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Wraps a lucide icon in a continuous, subtle "breathing" scale loop — the
 * idle/ambient counterpart to AnimatedChevron's interaction-triggered
 * rotate. `active` icons breathe more visibly than inactive ones (theme-
 * driven amplitude, see theme-config.ts's `MotionPreset.idle`), preserving
 * selected-vs-unselected hierarchy while keeping the whole set feeling
 * alive. Reduced-motion is handled entirely by the app-wide
 * `<MotionConfig reducedMotion="user">` (ThemeProvider.tsx) — no
 * component-level check needed since this only ever animates `scale`.
 */
export function IdleIcon({
  icon: Icon,
  active,
  className,
}: {
  icon: LucideIcon;
  active: boolean;
  className?: string;
}) {
  const preset = useMotionPreset();
  const { animate, transition } = idleBreathe(preset, active, Icon.displayName ?? "");

  return (
    <motion.span className="inline-flex shrink-0" animate={animate} transition={transition}>
      <Icon className={cn("w-4 h-4 shrink-0", className)} />
    </motion.span>
  );
}
