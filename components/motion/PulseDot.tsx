"use client";

import { cn } from "@/lib/utils";

/**
 * A small live-status dot (used next to running timers/counters). Pulses via
 * Tailwind's `motion-safe:animate-pulse` so it's inert under
 * prefers-reduced-motion without any component-level check.
 */
export function PulseDot({
  color,
  className,
}: {
  color: "warning" | "success";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "w-1.5 h-1.5 rounded-full motion-safe:animate-pulse",
        color === "warning" ? "bg-warning" : "bg-success",
        className
      )}
    />
  );
}
