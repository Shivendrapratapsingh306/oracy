"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";

/** Sends an already authenticated user to the dashboard. */
export function useRedirectIfSignedIn() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session) router.replace(session.role === "admin" ? "/admin" : "/dashboard");
  }, [session, router]);
}
