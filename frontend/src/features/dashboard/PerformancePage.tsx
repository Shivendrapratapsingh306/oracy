"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/dashboard/ui";
import { ProgressChart } from "@/components/charts/ProgressChart";
import { InterviewReportModal } from "@/features/dashboard/InterviewReportModal";
import { getProgressAnalytics, type ProgressAnalytics } from "@/services/api";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function PerformancePage() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<ProgressAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    getProgressAnalytics()
      .then(setAnalytics)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load progress analytics.");
      })
      .finally(() => setLoading(false));
  }, []);

  const scorePoints = (analytics?.score_trend || []).map((p) => p.score);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.performance.title")}
        description={t("dashboard.performance.subtitle")}
        actions={<ButtonLink href="/interview">{t("dashboard.overview.startPractice")}</ButtonLink>}
      />

      {loading ? (
        <div className="py-20 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cobalt/20 border-t-cobalt" />
          <p className="mt-4 text-sm text-sub">Analyzing your performance history…</p>
        </div>
      ) : error ? (
        <Card>
          <p role="alert" className="text-sm text-rose-700">
            Could not load analytics: {error}
          </p>
        </Card>
      ) : !analytics || analytics.completed_sessions === 0 ? (
        <Card>
          <EmptyState
            icon="chart"
            title="No completed interviews recorded yet"
            text="Performance trends, communication pacing metrics, and 6-dimension analytics are calculated exclusively from authentic completed practice interviews."
            action={<ButtonLink href="/interview">Start your first interview</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats Overview */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-mute">
                Overall Average
              </span>
              <p className="mt-2 font-display text-3xl text-cobalt">
                {analytics.overall_average_score !== null ? `${analytics.overall_average_score}` : "—"}
                <span className="text-sm text-mute font-normal"> / 100</span>
              </p>
              <span className="text-xs text-mute">Across completed interviews</span>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-mute">
                Completed Sessions
              </span>
              <p className="mt-2 font-display text-3xl text-ink">
                {analytics.completed_sessions}
              </p>
              <span className="text-xs text-mute">Fully evaluated</span>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-mute">
                In-Progress / Saved
              </span>
              <p className="mt-2 font-display text-3xl text-ink">
                {analytics.in_progress_sessions}
              </p>
              <span className="text-xs text-mute">Can be resumed anytime</span>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-mute">
                Speaking Sessions
              </span>
              <p className="mt-2 font-display text-3xl text-ink">
                {analytics.speaking_trends?.measured_sessions_count ?? 0}
              </p>
              <span className="text-xs text-mute">With microphone audio</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Score Over Time Chart */}
            <Card className="lg:col-span-8" labelledBy="pl-trend">
              <CardHeader
                id="pl-trend"
                title="Interview Score Trend"
                subtitle={analytics.data_summary_note}
              />

              {analytics.has_sufficient_data && scorePoints.length >= 2 ? (
                <div className="mt-4">
                  <ProgressChart points={scorePoints} />
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-mute justify-between border-t border-line/60 pt-3">
                    {analytics.score_trend.map((p, idx) => (
                      <button
                        key={p.session_id}
                        type="button"
                        onClick={() => setSelectedSessionId(p.session_id)}
                        className="rounded-lg border border-line bg-surface p-2 text-left hover:border-cobalt transition"
                      >
                        <span className="font-semibold text-ink block">
                          S{idx + 1} · {p.target_role}
                        </span>
                        <span className="text-[11px] text-mute">
                          {p.date} — <strong className="text-cobalt">{p.score}/100</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-slate-50 border border-line/60 p-6 text-center">
                  <p className="text-sm font-medium text-ink">
                    Single completed session recorded ({analytics.score_trend[0]?.score}/100)
                  </p>
                  <p className="mt-1 text-xs text-mute max-w-md mx-auto">
                    Complete at least one more interview to unlock your multi-session performance trend line.
                  </p>
                  <ButtonLink href="/interview" variant="outline" className="mt-4 text-xs">
                    Take another mock interview →
                  </ButtonLink>
                </div>
              )}
            </Card>

            {/* Strengths & Focus Areas */}
            <div className="space-y-6 lg:col-span-4">
              <Card labelledBy="pl-sf">
                <CardHeader id="pl-sf" title="Strongest & Practice Areas" />
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
                      Top Strengths
                    </span>
                    {analytics.strongest_areas.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 text-xs text-ink/80">
                        {analytics.strongest_areas.map((str, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="text-emerald-600 font-bold">✓</span> {str}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-mute">Requires more completed sessions.</p>
                    )}
                  </div>

                  <div className="border-t border-line/60 pt-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 block">
                      Recommended Focus
                    </span>
                    {analytics.areas_requiring_practice.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 text-xs text-ink/80">
                        {analytics.areas_requiring_practice.map((area, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="text-amber-600 font-bold">⚡</span> {area}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-mute">Solid performance across all evaluated dimensions.</p>
                    )}
                  </div>

                  {analytics.repeated_difficulty_tags.length > 0 && (
                    <div className="border-t border-line/60 pt-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-mute block">
                        Recurring Areas of Difficulty
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {analytics.repeated_difficulty_tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] text-rose-800 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* 6-Dimension Skill Breakdown */}
            <Card className="lg:col-span-7" labelledBy="pl-skills">
              <CardHeader
                id="pl-skills"
                title="Answer Quality Breakdown across 6 Dimensions"
                subtitle="Average scores derived from authentic question evaluations"
              />
              <div className="mt-5 space-y-4">
                {Object.entries(analytics.dimension_averages).map(([dimension, score]) => (
                  <div key={dimension} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-ink">{dimension}</span>
                      <span className="font-mono text-cobalt font-semibold">{score}/100</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cobalt transition-all duration-500"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Communication & Speaking Delivery Trends */}
            <Card className="lg:col-span-5" labelledBy="pl-speaking">
              <CardHeader
                id="pl-speaking"
                title="Speaking Delivery Trends"
                subtitle="Pacing and filler word control from audio recordings"
              />
              {analytics.speaking_trends.measured_sessions_count > 0 ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-mute block">
                      Speaking Pace Progression (WPM)
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-display text-2xl font-bold text-ink">
                        {analytics.speaking_trends.wpm_trend[analytics.speaking_trends.wpm_trend.length - 1]}
                      </span>
                      <span className="text-xs text-mute">WPM in latest session</span>
                    </div>
                    <div className="mt-2 flex gap-1 items-end h-10">
                      {analytics.speaking_trends.wpm_trend.map((wpm, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-emerald-500 rounded-t"
                          style={{ height: `${Math.min(100, (wpm / 180) * 100)}%` }}
                          title={`Session ${i + 1}: ${wpm} WPM`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-mute block mt-1">Target benchmark: 120-160 WPM</span>
                  </div>

                  {analytics.speaking_trends.filler_rate_trend.length > 0 && (
                    <div className="rounded-xl border border-line bg-surface p-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-mute block">
                        Filler Frequency Rate (per min)
                      </span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-display text-2xl font-bold text-ink">
                          {analytics.speaking_trends.filler_rate_trend[analytics.speaking_trends.filler_rate_trend.length - 1]}
                        </span>
                        <span className="text-xs text-mute">fillers/min in latest session</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-slate-50 border border-line/60 p-6 text-center text-xs text-mute">
                  <span className="text-2xl block mb-2">🎙️</span>
                  No audio recordings captured yet. Use the microphone during your practice sessions to unlock speaking pacing and filler word trends.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Modal for reopening complete reports */}
      {selectedSessionId && (
        <InterviewReportModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
