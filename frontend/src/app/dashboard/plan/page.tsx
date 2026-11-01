import type { Metadata } from "next";
import { PlanPage } from "@/features/dashboard/PlanPage";

export const metadata: Metadata = { title: "Daily Practice Plan" };

export default function Page() {
  return <PlanPage />;
}
