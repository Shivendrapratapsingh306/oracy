"use client";

import { Container, Eyebrow } from "@/components/Container";
import { Reveal, SplitText } from "@/components/Reveal";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function Features() {
  const { t } = useTranslation();

  const features = [
    {
      n: "01",
      title: t("landing.workflow.step1Title"),
      body: t("landing.workflow.step1Desc"),
      span: "lg:col-span-7",
      tone: "light",
    },
    {
      n: "02",
      title: t("landing.features.card1Title"),
      body: t("landing.features.card1Desc"),
      span: "lg:col-span-5",
      tone: "dark",
    },
    {
      n: "03",
      title: t("landing.features.card4Title"),
      body: t("landing.features.card4Desc"),
      span: "lg:col-span-4",
      tone: "dark",
    },
    {
      n: "04",
      title: t("landing.features.card2Title"),
      body: t("landing.features.card2Desc"),
      span: "lg:col-span-4",
      tone: "dark",
    },
    {
      n: "05",
      title: t("landing.features.card3Title"),
      body: t("landing.features.card3Desc"),
      span: "lg:col-span-4",
      tone: "dark",
    },
    {
      n: "06",
      title: t("landing.scoreShowcase.card3Title"),
      body: t("landing.scoreShowcase.card3Desc"),
      span: "lg:col-span-5",
      tone: "dark",
    },
    {
      n: "07",
      title: t("dashboard.overview.readinessScore"),
      body: t("dashboard.overview.readinessDesc"),
      span: "lg:col-span-7",
      tone: "light",
    },
  ] as const;

  return (
    <section id="features" className="scroll-mt-20 py-28 md:py-40">
      <Container>
        <Reveal><Eyebrow>{t("landing.features.eyebrow")}</Eyebrow></Reveal>
        <SplitText
          text={t("landing.features.heading")}
          accent=""
          className="mt-6 max-w-5xl font-display text-display"
        />
        <p className="mt-6 max-w-2xl text-lg text-ink/75">
          {t("landing.features.subheading")}
        </p>

        <ul className="mt-16 grid gap-5 lg:grid-cols-12">
          {features.map((f, i) => {
            const light = f.tone === "light";
            return (
              <Reveal as="li" key={f.n} delay={(i % 3) * 90} className={`${f.span}`}>
                <article
                  className={`group relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-3xl border p-8 transition duration-500 hover:-translate-y-1 md:p-10 ${
                    light
                      ? "border-cobalt/20 bg-cobalt-tint text-ink shadow-card hover:border-cobalt/60"
                      : "border-line bg-card hover:border-cobalt/60 hover:shadow-lift"
                  }`}
                >
                  <span className="font-mono text-xs tracking-[0.22em] text-cobalt">{f.n}</span>
                  <div>
                    <h3 className="font-display text-title">{f.title}</h3>
                    <p className="mt-4 max-w-md leading-relaxed text-ink/70">{f.body}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -right-6 -top-10 select-none font-display text-[10rem] leading-none transition duration-500 group-hover:-translate-y-2 ${
                      light ? "text-cobalt/[0.10]" : "text-ink/[0.04]"
                    }`}
                  >
                    {f.n}
                  </span>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
