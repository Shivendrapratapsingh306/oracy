"use client";

import type { CSSProperties } from "react";
import { useInView } from "@/hooks/useInView";

export function ScoreRing({ value, label = "Readiness", size = 220, valueClass = "text-6xl" }: { value: number; label?: string; size?: number; valueClass?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <div
      ref={ref}
      className={`relative ${inView ? "is-visible" : ""}`}
      style={{ width: size, height: size, "--v": value } as CSSProperties}
      role="img"
      aria-label={`${label} score ${value} out of 100; not based on a completed interview`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#E5EBF4" strokeWidth="8" />
        <circle className="ring-fg" cx="60" cy="60" r="52" fill="none" stroke="#285FE8" strokeWidth="8" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display leading-none ${valueClass}`}>{value}</span>
        <span className={`mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mute`}>/ 100 · {label}</span>
      </div>
    </div>
  );
}
