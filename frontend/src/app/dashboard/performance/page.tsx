import type { Metadata } from "next";
import { PerformancePage } from "@/features/dashboard/PerformancePage";

export const metadata: Metadata = { title: "Performance Lab" };

export default function Page() {
  return <PerformancePage />;
}
