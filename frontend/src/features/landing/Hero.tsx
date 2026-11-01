"use client";

import { ButtonLink } from "@/components/Button";
import { Container } from "@/components/Container";
import { ArrowRight } from "@/components/Icons";
import { Reveal, SplitText } from "@/components/Reveal";
import { StartLink } from "@/components/StartLink";
import { HeroDashboard } from "@/features/landing/HeroDashboard";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function Hero() {
  const { t } = useTranslation();

  const metrics = [
    [t("landing.features.card4Title"), t("landing.features.card4Desc")],
    [t("landing.features.card2Title"), t("landing.features.card2Desc")],
    [t("landing.features.card3Title"), t("landing.features.card3Desc")],
  ];

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_70%_60%_at_75%_30%,rgba(40,95,232,0.13),transparent_70%)]" aria-hidden="true" />
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden="true" />
      <Container className="grid flex-1 items-center gap-14 pb-20 pt-32 lg:grid-cols-12 lg:gap-8 lg:pt-36">
        <div className="lg:col-span-7">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-cobalt">
            {t("landing.hero.eyebrow")}
          </div>

          <SplitText
            as="h1"
            text={`${t("landing.hero.titleLine1")} ${t("landing.hero.titleLine2")}`}
            accent={t("landing.hero.titleLine2")}
            className="font-display text-[clamp(2.8rem,7vw,7rem)] leading-[0.92] tracking-[-0.03em]"
          />

          <Reveal delay={250}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75 md:text-xl">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <StartLink className="px-8 py-4 text-base">
                {t("landing.hero.startFree")} <ArrowRight />
              </StartLink>
              <ButtonLink href="/#how-it-works" variant="outline" className="px-8 py-4 text-base">
                {t("landing.hero.watchDemo")}
              </ButtonLink>
            </div>
            <dl className="mt-14 grid max-w-xl grid-cols-1 gap-6 border-t border-line pt-6 sm:grid-cols-3">
              <div>
                <dt className="font-display text-3xl text-cobalt">{t("landing.hero.statInterviews")}</dt>
                <dd className="mt-1 text-sm text-ink/70">10,000+</dd>
              </div>
              <div>
                <dt className="font-display text-3xl text-cobalt">{t("landing.hero.statPlacement")}</dt>
                <dd className="mt-1 text-sm text-ink/70">89%</dd>
              </div>
              <div>
                <dt className="font-display text-3xl text-cobalt">{t("landing.hero.statMetrics")}</dt>
                <dd className="mt-1 text-sm text-ink/70">15+</dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <Reveal className="lg:col-span-5 lg:pl-6" variant="scale" delay={200}>
          <HeroDashboard />
        </Reveal>
      </Container>
    </section>
  );
}
