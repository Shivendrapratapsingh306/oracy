"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/features/theme/ThemeContext";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink transition hover:border-cobalt hover:text-cobalt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${className}`}
    >
      {/* Sun icon (visible in dark mode) */}
      <svg
        className={`h-4 w-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100 text-amber-400"
            : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>

      {/* Moon icon (visible in light mode) */}
      <svg
        className={`h-4 w-4 transition-all duration-300 ${
          !isDark
            ? "rotate-0 scale-100 opacity-100 text-slate-700"
            : "rotate-90 scale-0 opacity-0 absolute"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>
    </button>
  );
}

