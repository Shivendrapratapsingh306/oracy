"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/Button";
import { useSession } from "@/hooks/useSession";

/**
 * Primary call-to-action. Visitors go to the signup page; signed-in
 * (demo) users go straight to interview setup.
 */
export function StartLink({
  children,
  variant = "primary",
  className = "",
  signedInHref = "/interview",
}: {
  children: ReactNode;
  variant?: "primary" | "dark" | "outline" | "ghost";
  className?: string;
  signedInHref?: string;
}) {
  const session = useSession();
  return (
    <ButtonLink href={session ? signedInHref : "/signup"} variant={variant} className={className}>
      {children}
    </ButtonLink>
  );
}
