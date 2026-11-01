"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-paper px-4 py-16 text-center text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 shadow-card">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 font-display text-3xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-sub">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()} className="w-full sm:w-auto">
            Try Again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:border-cobalt hover:text-cobalt"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

