import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "dark" | "outline" | "ghost";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium tracking-wide transition duration-300 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-cobalt text-white shadow-lift hover:-translate-y-0.5 hover:bg-cobalt-deep",
  dark: "bg-ink text-white hover:-translate-y-0.5 hover:bg-cobalt",
  outline: "border border-ink/20 bg-card text-ink hover:border-cobalt hover:text-cobalt",
  ghost: "text-ink/80 hover:text-cobalt",
};

export function ButtonLink({ href, variant = "primary", className = "", children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Button({ variant = "primary", className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
