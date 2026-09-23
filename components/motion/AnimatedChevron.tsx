"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function AnimatedChevron({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  const spring = useThemeSpring();
  return (
    <motion.span
      className={cn("inline-flex shrink-0", className)}
      animate={{ rotate: open ? 180 : 0 }}
      transition={spring}
    >
      <ChevronDown className="w-4 h-4" />
    </motion.span>
  );
}
