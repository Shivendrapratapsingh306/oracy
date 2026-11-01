"use client";

import { createContext, useContext } from "react";
import type { DashboardData } from "@/lib/dashboard-data";
import type { Session } from "@/services/auth";

export interface DashboardCtx {
  session: Session;
  data: DashboardData;
  /** Returns false when the browser could not persist the change. */
  update: (fn: (d: DashboardData) => DashboardData) => boolean;
  displayName: string;
  firstName: string;
  today: string;
}

export const DashboardContext = createContext<DashboardCtx | null>(null);

export function useDashboard(): DashboardCtx {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside the dashboard shell");
  return ctx;
}
