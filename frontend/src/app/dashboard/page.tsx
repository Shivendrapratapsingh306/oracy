import type { Metadata } from "next";
import { OverviewPage } from "@/features/dashboard/OverviewPage";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <OverviewPage />;
}
