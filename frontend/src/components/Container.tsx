import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-page px-5 sm:px-8 lg:px-12 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-mute ${className}`}>
      <span className="h-px w-8 bg-cobalt" aria-hidden="true" />
      {children}
    </p>
  );
}
