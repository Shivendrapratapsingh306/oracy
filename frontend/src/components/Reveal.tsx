"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  variant?: "up" | "fade" | "scale";
  className?: string;
};

/** Scroll-triggered reveal. Respects reduced motion via CSS. */
export function Reveal({ children, as = "div", delay = 0, variant = "up", className = "" }: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();
  const Tag = as;
  return (
    <Tag
      ref={ref}
      data-variant={variant}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

type SplitTextProps = {
  text: string;
  accent?: string;
  as?: ElementType;
  className?: string;
  delay?: number;
};

/** Staggered word-by-word headline reveal with an optional cobalt italic accent. */
export function SplitText({ text, accent, as = "h2", className = "", delay = 0 }: SplitTextProps) {
  const { ref, inView } = useInView<HTMLElement>(0.3);
  const Tag = as;
  const words = text.split(" ");
  return (
    <Tag
      ref={ref}
      aria-label={text}
      className={`split ${inView ? "is-visible" : ""} ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {words.map((word, i) => {
        const isAccent = word === accent;
        return (
          <span key={i} aria-hidden="true">
            <span className="w" style={{ "--i": i } as CSSProperties}>
              <span className={isAccent ? "font-display italic text-cobalt" : ""}>{word}</span>
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </Tag>
  );
}
