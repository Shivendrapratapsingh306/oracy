"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSession, readRawSession, subscribeSession, type Session } from "@/services/auth";

const noopSubscribe = () => () => {};

/** Current authenticated session snapshot, or null. Null on the server and first render. */
export function useSession(): Session | null {
  const raw = useSyncExternalStore(subscribeSession, readRawSession, () => null);
  return useMemo(() => parseSession(raw), [raw]);
}

/** False during SSR/hydration, true afterwards. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
