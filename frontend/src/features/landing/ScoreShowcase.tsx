"use client";

import { Container } from "@/components/Container";
import { Reveal, SplitText } from "@/components/Reveal";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { demoComponents, demoOverallScore, demoProgress } from "@/lib/demo-data";
import { useTranslation } from "@/features/i18n/LanguageContext";
import type { CSSProperties } from "react";

export function ScoreShowcase() {
  const { t } = useTranslation();

  return (
    <section id="score" className="scroll-mt-20 border-y border-line bg-cobalt-tint/50 py-28 text-ink md:py-40">
      <Container>
        <Reveal>
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/75">
            <span className="h-px w-8 bg-cobalt" aria-hidden="true" />
            {t("landing.scoreShowcase.eyebrow")}
          </p>
        </Reveal>
        <SplitText
          text={t("landing.scoreShowcase.heading")}
          accent=""
          className="mt-6 max-w-4xl font-display text-display"
        />
        <p className="mt-6 max-w-2xl text-lg text-ink/75">
          {t("landing.scoreShowcase.subheading")}
        </p>

        <div className="mt-16 grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-line bg-card p-10 text-ink shadow-card">
              <ScoreRing value={demoOverallScore} label={t("common.score")} size={240} />
              <p className="mt-6 text-center text-sm text-ink/70">{t("dashboard.overview.readinessScore")}</p>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-8" delay={100}>
            <div className="h-full rounded-3xl border border-line bg-card p-8 shadow-card md:p-10">
              <h3 className="font-display text-title">{t("dashboard.overview.radarTitle")}</h3>
              <ul className="mt-8 space-y-6">
                {demoComponents.map((c) => (
                  <li key={c.key}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-medium">{c.label}</span>
                      <span className="font-mono text-sm">{c.score}</span>
                    </div>
                    <div className="meter mt-2 h-2 overflow-hidden rounded-full bg-line" style={{ "--w": `${c.score}%` } as CSSProperties}>
                      <i className="rounded-full bg-cobalt" />
                    </div>
                    <p className="mt-2 text-sm text-ink/70">{c.evidence}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-12" delay={150}>
            <div className="grid gap-8 rounded-3xl border border-line bg-card p-8 text-ink shadow-card md:grid-cols-12 md:p-12">
              <div className="md:col-span-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cobalt">{t("dashboard.performance.trendsTitle")}</p>
                <h3 className="mt-4 font-display text-title">{t("dashboard.performance.title")}</h3>
                <p className="mt-4 text-ink/70">{t("dashboard.performance.subtitle")}</p>
              </div>
              <div className="md:col-span-8">
                <ProgressChart points={demoProgress} />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
