"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ButtonLink } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Icon, type IconName } from "@/components/dashboard/Icon";
import { Avatar } from "@/components/dashboard/ui";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIsClient, useSession } from "@/hooks/useSession";
import { buildNotifications, profileCompletion, todayISO } from "@/lib/dashboard-data";
import { signOut, type Session } from "@/services/auth";
import { DashboardContext, useDashboard } from "@/features/dashboard/DashboardContext";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function DashboardShell({ children }: { children: ReactNode }) {
  const ready = useIsClient();
  const session = useSession();
  if (!ready) return <div className="min-h-svh bg-paper" aria-busy="true" />;
  if (!session) return <SignedOut />;
  if (session.role !== "student") return <SignedOut />;
  return <SignedInShell session={session}>{children}</SignedInShell>;
}

function SignedOut() {
  const { t } = useTranslation();
  return (
    <main id="main" className="flex min-h-svh items-center justify-center bg-paper px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-card">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-8 font-display text-3xl text-ink">{t("auth.signIn.title")}</h1>
        <p className="mt-3 text-sub">{t("auth.signIn.subtitle")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/login">{t("auth.signIn.submit")}</ButtonLink>
          <ButtonLink href="/signup" variant="outline">{t("auth.signUp.submit")}</ButtonLink>
        </div>
        <Link href="/" className="mt-6 inline-block text-sm text-cobalt underline-offset-4 hover:underline">{t("nav.home")}</Link>
      </div>
    </main>
  );
}

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

function SignedInShell({ session, children }: { session: Session; children: ReactNode }) {
  const { data, update } = useDashboardData(session.email, session.name);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const [drawer, setDrawer] = useState(false);
  const displayName = data.profile.name.trim() || session.name;
  const today = todayISO();

  const ctx = useMemo(
    () => ({ session, data, update, displayName, firstName: displayName.split(" ")[0] || displayName, today }),
    [session, data, update, displayName, today],
  );

  const navItems: { label: string; href: string; icon: IconName; exact?: boolean }[] = useMemo(
    () => [
      { label: t("dashboard.sidebar.overview"), href: "/dashboard", icon: "home", exact: true },
      { label: t("dashboard.sidebar.practice"), href: "/interview", icon: "mic" },
      { label: t("dashboard.sidebar.performance"), href: "/dashboard/performance", icon: "chart" },
      { label: t("dashboard.sidebar.career"), href: "/dashboard/career", icon: "briefcase" },
      { label: t("dashboard.sidebar.plan"), href: "/dashboard/plan", icon: "calendar" },
      { label: t("dashboard.sidebar.history"), href: "/dashboard/history", icon: "history" },
      { label: t("dashboard.sidebar.profile"), href: "/dashboard/profile", icon: "user" },
      { label: t("dashboard.sidebar.settings"), href: "/dashboard/settings", icon: "settings" },
    ],
    [t]
  );

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const current = navItems.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href) && n.href !== "/interview"));

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <DashboardContext.Provider value={ctx}>
      <div className="min-h-svh bg-paper text-ink">
        {drawer && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <aside
          id="dashboard-sidebar"
          aria-label="Dashboard sidebar"
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-card transition-[transform,visibility] duration-300 lg:visible lg:w-64 lg:translate-x-0 ${drawer ? "visible translate-x-0" : "invisible -translate-x-full"}`}
        >
          <div className="flex h-16 items-center justify-between px-5">
            <Logo />
            <button type="button" onClick={() => setDrawer(false)} aria-label={t("nav.closeMenu")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-sub lg:hidden">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = current?.href === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-surface text-cobalt" : "text-ink/75 hover:bg-paper hover:text-cobalt"}`}
                    >
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-3 border-t border-line p-4">
            <div className="rounded-xl bg-surface p-3 text-xs leading-relaxed text-sub">
              {t("landing.faq.a1")}
            </div>
            <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/75 transition hover:bg-paper hover:text-cobalt">
              <Icon name="logout" className="h-[18px] w-[18px]" /> {t("dashboard.sidebar.signOut")}
            </button>
          </div>
        </aside>

        <div className="min-w-0 lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-card/85 px-4 backdrop-blur sm:px-6 lg:px-10">
            <button type="button" onClick={() => setDrawer(true)} aria-label={t("nav.openMenu")} aria-expanded={drawer} aria-controls="dashboard-sidebar" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink lg:hidden">
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-2 truncate text-sm">
                <li className="hidden text-sub sm:block">{t("nav.dashboard")}</li>
                <li aria-hidden="true" className="hidden text-mute-2 sm:block">/</li>
                <li aria-current="page" className="truncate font-medium text-ink">{current?.label ?? t("dashboard.sidebar.overview")}</li>
              </ol>
            </nav>
            <LanguageSelector />
            <ThemeToggle />
            <NotificationMenu />
            <ProfileMenu onSignOut={handleSignOut} />
          </header>

          <main id="main" tabIndex={-1} className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}

function NotificationMenu() {
  const { data, update, today } = useDashboard();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);

  const items = useMemo(() => buildNotifications(data, today), [data, today]);
  const unread = items.filter((n) => !data.readNotifications.includes(n.id));
  const showBadge = data.settings.inApp && unread.length > 0;

  function markAllRead() {
    update((d) => ({ ...d, readNotifications: Array.from(new Set([...d.readNotifications, ...items.map((n) => n.id)])).slice(-100) }));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={showBadge ? `Notifications, ${unread.length} unread` : "Notifications"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink transition hover:border-cobalt"
      >
        <Icon name="bell" className="h-5 w-5 text-sub" />
        {showBadge && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cobalt ring-2 ring-card" aria-hidden="true" />}
      </button>

      {open && (
        <div id="notification-panel" className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card p-2 shadow-lift sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            {unread.length > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-cobalt hover:underline">
                {t("common.all")}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-sub">{t("common.none")}</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((n) => {
                const isUnread = !data.readNotifications.includes(n.id);
                return (
                  <li key={n.id}>
                    <Link href={n.href} onClick={() => { setOpen(false); update((d) => ({ ...d, readNotifications: Array.from(new Set([...d.readNotifications, n.id])).slice(-100) })); }} className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-paper">
                      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? "bg-cobalt" : "bg-line"}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{n.title}</span>
                        <span className="mt-0.5 block text-sm text-sub">{n.body}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ onSignOut }: { onSignOut: () => void }) {
  const { data, displayName, session } = useDashboard();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  const completion = profileCompletion(data);

  const row = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink/80 transition hover:bg-paper hover:text-cobalt";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="profile-panel" aria-label={`Account menu for ${displayName}`} className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 transition hover:border-cobalt">
        <Avatar name={displayName} photo={data.profile.photo} size={32} />
        <Icon name="chevronDown" className="h-4 w-4 text-sub" />
      </button>
      {open && (
        <div id="profile-panel" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-line bg-card p-2 shadow-lift">
          <div className="px-3 py-3">
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
            <p className="truncate text-xs text-sub">{session.email}</p>
            <p className="mt-2 text-xs text-sub">{completion.percent}%</p>
          </div>
          <div className="border-t border-line pt-1">
            <Link href="/dashboard/profile" onClick={() => setOpen(false)} className={row}><Icon name="user" className="h-4 w-4" /> {t("dashboard.sidebar.profile")}</Link>
            <Link href="/dashboard/career" onClick={() => setOpen(false)} className={row}><Icon name="briefcase" className="h-4 w-4" /> {t("dashboard.sidebar.career")}</Link>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)} className={row}><Icon name="settings" className="h-4 w-4" /> {t("dashboard.sidebar.settings")}</Link>
            <Link href="/" onClick={() => setOpen(false)} className={row}><Icon name="home" className="h-4 w-4" /> {t("nav.home")}</Link>
          </div>
          <div className="border-t border-line pt-1">
            <button type="button" onClick={() => { setOpen(false); onSignOut(); }} className={row}><Icon name="logout" className="h-4 w-4" /> {t("dashboard.sidebar.signOut")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
