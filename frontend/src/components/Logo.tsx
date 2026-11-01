import Link from "next/link";

/**
 * ORACY mark: a speech bubble holding sound bars and an AI spark.
 * Cobalt bubble with white details.
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M14 4h20a10 10 0 0 1 10 10v12a10 10 0 0 1-10 10H22l-10 8v-8.5A10 10 0 0 1 4 26V14A10 10 0 0 1 14 4Z" fill="#285FE8" />
      <g fill="#FFFFFF">
        <rect x="10.5" y="16" width="3" height="8" rx="1.5" />
        <rect x="15.5" y="11" width="3" height="18" rx="1.5" />
        <rect x="20.5" y="14" width="3" height="12" rx="1.5" />
        <rect x="25.5" y="17" width="3" height="6" rx="1.5" />
        <path d="M35 13.5 36.7 18.3 41.5 20 36.7 21.7 35 26.5 33.3 21.7 28.5 20 33.3 18.3Z" />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="ORACY home" className={`inline-flex items-center gap-3 text-ink ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.75rem] leading-none tracking-[0.14em]">ORACY</span>
    </Link>
  );
}
