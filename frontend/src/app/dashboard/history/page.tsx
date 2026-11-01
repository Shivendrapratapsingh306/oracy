import type { Metadata } from "next";
import { HistoryPage } from "@/features/dashboard/HistoryPage";

export const metadata: Metadata = { title: "Interview History" };

export default function Page() {
  return <HistoryPage />;
}
