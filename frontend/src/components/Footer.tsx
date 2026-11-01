"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Container } from "@/components/Container";
import { siteConfig } from "@/lib/site";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function Footer() {
  const { t } = useTranslation();

  const cols = [
    {
      title: t("landing.footer.product"),
      links: [
        { label: t("nav.features"), href: "/#features" },
        { label: t("nav.preview"), href: "/#preview" },
        { label: t("nav.howItWorks"), href: "/#how-it-works" },
        { label: t("landing.scoreShowcase.eyebrow"), href: "/#score" },
        { label: t("landing.faq.eyebrow"), href: "/#faq" },
      ],
    },
    {
      title: t("landing.footer.resources"),
      links: [
        { label: t("nav.signIn"), href: "/login" },
        { label: t("auth.signUp.submit"), href: "/signup" },
        { label: t("auth.forgotPassword.title"), href: "/forgot-password" },
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.interview"), href: "/interview" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-line bg-card pb-10 pt-20">
      <Container>
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-6">
            <Logo />
            <p className="mt-8 max-w-md font-display text-4xl leading-[1.05] sm:text-5xl">
              {t("landing.hero.titleLine1")}{" "}
              <span className="italic text-cobalt">{t("landing.hero.titleLine2")}</span>
            </p>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title} className="md:col-span-3 lg:col-span-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">{c.title}</h2>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-ink/80 transition hover:text-cobalt">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-line pt-8 text-sm text-mute md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. {t("landing.footer.copyright")}</p>
          <p className="max-w-xl md:text-right">
            {t("landing.faq.a1")}
          </p>
        </div>
      </Container>
    </footer>
  );
}
