import type { Metadata } from "next";
import { CareerPage } from "@/features/dashboard/CareerPage";

export const metadata: Metadata = { title: "Career Launchpad" };

export default function Page() {
  return <CareerPage />;
}
