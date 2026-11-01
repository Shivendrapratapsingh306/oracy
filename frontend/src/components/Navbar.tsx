"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/features/i18n/LanguageContext";
import { useSession } from "@/hooks/useSession";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const session = useSession();
  const { t } = useTranslation();

  const links = [
    { href: "#features", label: t("nav.features") },
    { href: "#how-it-works", label: t("nav.howItWorks") },
    { href: "#preview", label: t("nav.preview") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition duration-500 ${scrolled || open ? "bg-paper/85 backdrop-blur-xl" : "bg-transparent"} ${scrolled ? "border-b border-line" : "border-b border-transparent"}`}>
      <nav aria-label="Main" className="mx-auto flex h-[72px] w-full max-w-page items-center justify-between px-5 sm:px-8 lg:px-12">
        <Logo />

        <ul className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-sm text-ink/75 transition hover:text-cobalt">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSelector />
          <ThemeToggle />
          {session ? (
            <>
              <ButtonLink href="/dashboard" variant="ghost">{t("nav.dashboard")}</ButtonLink>
              <ButtonLink href="/interview">{t("nav.interview")}</ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">{t("nav.signIn")}</ButtonLink>
              <ButtonLink href="/signup">{t("nav.getStarted")}</ButtonLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSelector compact />
          <ThemeToggle />
          <button
            type="button"
            className="relative z-50 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 h-px w-5 bg-ink transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-3 h-px w-5 bg-ink transition ${open ? "top-1.5 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>

      <div id="mobile-menu" className={`fixed inset-0 top-0 z-40 flex-col justify-center bg-paper px-8 md:hidden ${open ? "flex" : "hidden"}`}>
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
          <span className="text-xs uppercase tracking-wider text-mute">{t("nav.language")}</span>
          <LanguageSelector />
        </div>
        <ul className="space-y-5">
          {links.map((l) => (
            <li key={l.href}>
              <Link onClick={close} href={l.href} className="font-display text-5xl">
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link onClick={close} href={session ? "/dashboard" : "/login"} className="font-display text-5xl text-mute">
              {session ? t("nav.dashboard") : t("nav.signIn")}
            </Link>
          </li>
        </ul>
        <div className="mt-10">
          <ButtonLink href={session ? "/interview" : "/signup"} className="w-full">
            {session ? t("nav.interview") : t("nav.getStarted")}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
