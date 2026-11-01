import type { Metadata } from "next";
import { SettingsPage } from "@/features/dashboard/SettingsPage";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsPage />;
}
