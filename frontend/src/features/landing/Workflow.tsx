"use client";

import { Container, Eyebrow } from "@/components/Container";
import { Reveal, SplitText } from "@/components/Reveal";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function Workflow() {
  const { t } = useTranslation();

  const steps = [
    {
      n: "01",
      title: t("landing.workflow.step1Title"),
      body: t("landing.workflow.step1Desc"),
    },
    {
      n: "02",
      title: t("landing.workflow.step2Title"),
      body: t("landing.workflow.step2Desc"),
    },
    {
      n: "03",
      title: t("landing.workflow.step3Title"),
      body: t("landing.workflow.step3Desc"),
    },
    {
      n: "04",
      title: t("landing.workflow.step4Title"),
      body: t("landing.workflow.step4Desc"),
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 py-28 md:py-40">
      <Container>
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Reveal><Eyebrow>{t("landing.workflow.eyebrow")}</Eyebrow></Reveal>
              <SplitText
                text={t("landing.workflow.heading")}
                accent=""
                className="mt-6 font-display text-display"
              />
              <p className="mt-6 max-w-md text-lg text-ink/75">
                {t("landing.hero.subtitle")}
              </p>
            </div>
          </div>

          <ol className="space-y-5 lg:col-span-7">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 60}>
                <div className="group flex gap-6 rounded-3xl border border-line bg-card p-8 transition duration-500 hover:border-cobalt/60 md:gap-10 md:p-10">
                  <span className="outline-text font-display text-7xl leading-none transition duration-500 group-hover:text-cobalt md:text-8xl" aria-hidden="true">{s.n}</span>
                  <div>
                    <h3 className="font-display text-title">
                      <span className="sr-only">Step {i + 1}: </span>
                      {s.title}
                    </h3>
                    <p className="mt-3 max-w-md leading-relaxed text-ink/70">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
