"use client";

import { useState, type CSSProperties } from "react";
import { Container, Eyebrow } from "@/components/Container";
import { Portrait } from "@/components/Portrait";
import { Reveal, SplitText } from "@/components/Reveal";
import { siteConfig } from "@/lib/site";
import { useTranslation } from "@/features/i18n/LanguageContext";

const BARS = [30, 52, 38, 70, 44, 86, 60, 34, 78, 50, 92, 64, 40, 72, 48, 88, 56, 36, 68, 82, 46, 74, 58, 90, 42, 66, 80, 52, 38, 76, 54, 84, 44, 62, 32, 48];

type Segment = { t: string; filler?: boolean };

export function InterviewPreview() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  const samples = [
    {
      tab: t("interview.setup.typeHr"),
      meta: t("interview.room.questionBadge", { current: 1, total: 3 }),
      q: t("landing.preview.sampleQuestion"),
      answer: [
        { t: t("landing.preview.sampleAnswer") },
        { t: " ... ", filler: false },
      ] as Segment[],
      speech: { rate: `148 ${t("dashboard.performance.wpmUnit")}`, fillers: `2 ${t("dashboard.performance.fillerRate")}`, pauses: t("interview.audio.pauses") },
      vision: [t("landing.preview.postureGood"), t("landing.preview.faceCentered"), t("dashboard.report.visualFraming")],
      nlp: [
        [t("dashboard.report.feedback"), 88],
        [t("dashboard.overview.readinessScore"), 84],
        [t("dashboard.report.scoringMethod"), 90],
      ] as [string, number][],
    },
  ];

  const s = samples[0];

  return (
    <section id="preview" className="scroll-mt-20 border-y border-line bg-card/60 py-28 md:py-40">
      <Container>
        <Reveal><Eyebrow>{t("landing.preview.eyebrow")}</Eyebrow></Reveal>
        <SplitText
          text={t("landing.preview.heading")}
          accent=""
          className="mt-6 max-w-4xl font-display text-display"
        />
        <p className="mt-6 max-w-2xl text-lg text-ink/75">
          {t("landing.preview.subheading")}
        </p>

        <Reveal className="mt-14" variant="scale">
          <div className="overflow-hidden rounded-[2rem] border border-line bg-card shadow-lift" data-paused={!playing}>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
              <div role="tablist" aria-label="Preview questions" className="flex flex-wrap gap-2">
                <span className="rounded-full bg-cobalt px-4 py-2 text-sm text-white">
                  {t("landing.preview.badge")}
                </span>
              </div>
              <button
                type="button"
                aria-pressed={playing}
                onClick={() => setPlaying((p) => !p)}
                className="flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-ink/70 transition hover:border-cobalt hover:text-cobalt"
              >
                <span className={`h-2 w-2 rounded-full ${playing ? "bg-cobalt" : "bg-mute"}`} aria-hidden="true" />
                {playing ? t("common.finish") : t("common.start")}
              </button>
            </div>

            <div id="preview-panel" role="tabpanel" className="grid lg:grid-cols-12">
              <div className="space-y-8 p-6 sm:p-8 lg:col-span-7 lg:p-10">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cobalt">{s.meta}</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">{s.q}</h3>
                </div>

                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("dashboard.report.yourAnswer")}</p>
                  <p className="rounded-2xl border border-line bg-card p-5 leading-relaxed text-ink/85">
                    {s.answer.map((seg, i) =>
                      seg.filler ? (
                        <mark key={i} className="rounded bg-cobalt/10 px-1 text-cobalt-deep">{seg.t}</mark>
                      ) : (
                        <span key={i}>{seg.t}</span>
                      ),
                    )}
                  </p>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("interview.audio.clickToRecord")}</p>
                    <p className="font-mono text-xs text-ink/70">{s.speech.rate} • {s.speech.fillers}</p>
                  </div>
                  <div className="flex h-20 items-center gap-[3px] rounded-2xl border border-line bg-card px-4" aria-hidden="true">
                    {BARS.map((h, i) => (
                      <span key={i} className="bar block flex-1 rounded-full bg-cobalt" style={{ height: `${h}%`, opacity: 0.35 + h / 160, "--i": i } as CSSProperties} />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{t("dashboard.report.feedback")}</p>
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {s.nlp.map(([label, value]) => (
                      <li key={label}>
                        <div className="mb-1.5 flex justify-between text-sm text-ink/75">
                          <span>{label}</span>
                          <span className="font-mono">{value}</span>
                        </div>
                        <div className="meter h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${label} score: ${value} out of 100`}>
                          <i className="rounded-full bg-cobalt" style={{ width: `${value}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="relative min-h-[420px] border-t border-line lg:col-span-5 lg:border-l lg:border-t-0">
                <Portrait photo={siteConfig.photography.preview} alt="Interview candidate" landmarks />
                <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/70">
                    {t("interview.vision.privacyNotice")}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {s.vision.map((v) => (
                      <li key={v} className="rounded-full border border-line bg-card/85 px-3 py-1.5 text-xs text-ink/85 backdrop-blur">{v}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
