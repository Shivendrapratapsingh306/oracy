"use client";

import { StartLink } from "@/components/StartLink";
import { ArrowRight, Plus } from "@/components/Icons";
import { Container, Eyebrow } from "@/components/Container";
import { Parallax } from "@/components/Parallax";
import { Portrait } from "@/components/Portrait";
import { Reveal, SplitText } from "@/components/Reveal";
import { siteConfig } from "@/lib/site";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function CtaFaq() {
  const { t } = useTranslation();

  const faqs = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden py-32 md:py-48">
        <div className="absolute inset-0 -z-10">
          <Parallax speed={0.08}>
            <div className="h-full w-full opacity-60 md:translate-x-[30%]">
              <Portrait photo={siteConfig.photography.cta} alt="" />
            </div>
          </Parallax>
          <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/80 to-paper/10" />
        </div>
        <Container>
          <SplitText
            text={t("landing.faq.ctaTitle")}
            accent=""
            className="max-w-4xl font-display text-hero"
          />
          <Reveal delay={200}>
            <p className="mt-8 max-w-xl text-lg text-ink/75">
              {t("landing.faq.ctaSubtitle")}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <StartLink className="px-8 py-4 text-base" signedInHref="/dashboard">
                {t("landing.faq.dashboardButton")} <ArrowRight />
              </StartLink>
              <StartLink variant="outline" className="px-8 py-4 text-base">
                {t("landing.faq.ctaButton")}
              </StartLink>
            </div>
          </Reveal>
        </Container>
      </section>

      <section id="faq" className="scroll-mt-20 py-28 md:py-36">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Reveal><Eyebrow>{t("landing.faq.eyebrow")}</Eyebrow></Reveal>
              <SplitText
                text={t("landing.faq.heading")}
                accent=""
                className="mt-6 font-display text-display"
              />
            </div>
            <div className="lg:col-span-8">
              {faqs.map((f, i) => (
                <Reveal key={f.q} delay={i * 40}>
                  <details className="group border-b border-line py-6">
                    <summary className="flex cursor-pointer items-center justify-between gap-6 font-display text-2xl transition hover:text-cobalt md:text-3xl">
                      {f.q}
                      <Plus />
                    </summary>
                    <p className="mt-4 max-w-2xl leading-relaxed text-ink/75">{f.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
