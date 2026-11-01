"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { dashboardKey, normalizeData, readDashboardRaw, subscribeDashboard, writeDashboardRaw, type DashboardData } from "@/lib/dashboard-data";

/**
 * Per-student dashboard state backed by localStorage (demo persistence).
 * Server snapshot is null, so it is only read after client mount.
 */
export function useDashboardData(email: string, fallbackName: string) {
  const key = dashboardKey(email);
  const getSnapshot = useCallback(() => readDashboardRaw(key), [key]);
  const raw = useSyncExternalStore(subscribeDashboard, getSnapshot, () => null);

  const data = useMemo(() => {
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }
    return normalizeData(parsed, fallbackName);
  }, [raw, fallbackName]);

  const latest = useRef(data);
  latest.current = data;

  /** Applies `fn` to the latest data. Returns false if the browser could not persist it. */
  const update = useCallback(
    (fn: (d: DashboardData) => DashboardData): boolean => writeDashboardRaw(key, JSON.stringify(fn(latest.current))),
    [key],
  );

  return { data, update };
}
