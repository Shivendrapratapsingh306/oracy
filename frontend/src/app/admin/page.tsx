"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useIsClient, useSession } from "@/hooks/useSession";
import { authHeaders, signOut } from "@/services/auth";
import { siteConfig } from "@/lib/site";
import { useTranslation } from "@/features/i18n/LanguageContext";

type AdminOverview = {
  user_count: number;
  student_count: number;
  admin_count: number;
  interview_count: number;
  completed_interview_count: number;
  recent_users: Array<{ id: string; full_name: string; email: string; role: "student" | "admin"; created_at: string }>;
};

export default function AdminPage() {
  const ready = useIsClient();
  const session = useSession();
  const router = useRouter();
  const { t, formatDate } = useTranslation();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!session) { router.replace("/admin/login"); return; }
    if (session.role !== "admin") { router.replace("/dashboard"); return; }
    fetch(`${siteConfig.apiBaseUrl}/auth/admin/overview`, { headers: authHeaders(), cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? "Administrator permission required." : `Could not load admin data (${response.status}).`);
        return response.json() as Promise<AdminOverview>;
      })
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load admin data."))
      .finally(() => setLoading(false));
  }, [ready, session, router]);

  async function onSignOut() {
    await signOut();
    router.replace("/admin/login");
  }

  if (!ready || !session || session.role !== "admin") return <main className="min-h-svh bg-paper" aria-busy="true" />;
  const stats = [
    [t("adminPortal.totalUsers"), overview?.user_count ?? "—"],
    [t("dashboard.sidebar.student"), overview?.student_count ?? "—"],
    [t("adminPortal.activeAdmins"), overview?.admin_count ?? "—"],
    [t("adminPortal.totalInterviews"), overview?.interview_count ?? "—"],
    [t("adminPortal.completedInterviews"), overview?.completed_interview_count ?? "—"],
  ] as const;

  return (
    <main className="min-h-svh bg-paper px-5 py-8 text-ink sm:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-line pb-5">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSelector compact />
          <ThemeToggle />
          <span className="hidden text-right sm:block">
            <strong className="block text-sm">{session.name}</strong>
            <span className="text-xs text-sub">{t("nav.admin")}</span>
          </span>
          <Button variant="outline" onClick={onSignOut}>{t("nav.signOut")}</Button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cobalt">{t("nav.admin")}</p>
        <h1 className="mt-3 font-display text-5xl">{t("adminPortal.title")}</h1>
        <p className="mt-4 max-w-2xl text-ink/75">{t("adminPortal.subtitle")}</p>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-line bg-card p-5">
              <dt className="text-xs uppercase tracking-wider text-mute">{k}</dt>
              <dd className="mt-2 font-display text-4xl text-cobalt">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10 rounded-2xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl">{t("adminPortal.recentUsers")}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-mute">
                <tr>
                  <th className="pb-3">{t("adminPortal.userTable.name")}</th>
                  <th className="pb-3">{t("adminPortal.userTable.email")}</th>
                  <th className="pb-3">{t("adminPortal.userTable.role")}</th>
                  <th className="pb-3">{t("adminPortal.userTable.joined")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {overview?.recent_users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 font-medium">{u.full_name}</td>
                    <td className="py-3 text-sub">{u.email}</td>
                    <td className="py-3"><span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-xs font-semibold text-cobalt">{u.role}</span></td>
                    <td className="py-3 text-sub">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
