import type { Metadata } from "next";
import { ProfilePage } from "@/features/dashboard/ProfilePage";

export const metadata: Metadata = { title: "My Profile" };

export default function Page() {
  return <ProfilePage />;
}
