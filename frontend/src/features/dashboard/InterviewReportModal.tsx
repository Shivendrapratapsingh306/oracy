"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/Button";
import { Badge } from "@/components/dashboard/ui";
import { getInterviewReport, type InterviewReport } from "@/services/api";
import { useTranslation } from "@/features/i18n/LanguageContext";

type Props = {
  sessionId: string;
  onClose: () => void;
};

export function InterviewReportModal({ sessionId, onClose }: Props) {
  const { t, formatDate, formatNumber } = useTranslation();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getInterviewReport(sessionId)
      .then((data) => {
        if (isMounted) {
          setReport(data);
          if (data.questions.length > 0) {
            setExpandedQuestion(data.questions[0].question_id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load report.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-line bg-card p-6 shadow-2xl sm:p-8">
        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          aria-label={t("common.close")}
        >
          ✕
        </button>

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cobalt/20 border-t-cobalt" />
            <p className="mt-4 text-sm text-sub">Loading authentic performance report…</p>
          </div>
        ) : error || !report ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-rose-700">Could not open report</p>
            <p className="mt-1 text-xs text-mute">{error || "Report data unavailable."}</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-cobalt">
                  Official Performance Report
                </span>
                <Badge tone={report.status === "completed" ? "ok" : "warn"}>
                  {report.status === "completed" ? "Completed Interview" : "In Progress / Interrupted"}
                </Badge>
                <span className="text-xs text-mute capitalize">
                  {report.experience_level} · {report.interview_type}
                </span>
              </div>
              <h1 id="report-modal-title" className="mt-2 font-display text-2xl sm:text-3xl text-ink">
                {report.target_role} Practice Session
              </h1>
              <p className="mt-1 text-xs text-mute">
                Session ID: {report.session_id.slice(0, 8)}… · Recorded on{" "}
                {new Date(report.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Documented Dynamic Scoring Card */}
            <div className="rounded-2xl border border-line bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                    Overall Performance Evaluation
                  </span>
                  <h2 className="mt-1 font-display text-2xl text-ink flex items-baseline gap-2">
                    {report.scoring.overall_score !== null ? (
                      <>
                        <span className="text-3xl text-cobalt">{report.scoring.overall_score}</span>
                        <span className="text-sm text-mute">/ 100</span>
                      </>
                    ) : (
                      <span className="text-amber-600 text-xl font-medium">Incomplete Session</span>
                    )}
                  </h2>
                  <p className="mt-1 text-xs text-ink/70 font-medium">
                    Method: {report.scoring.scoring_method}
                  </p>
                  <p className="mt-0.5 text-[11px] text-mute leading-relaxed max-w-xl">
                    {report.scoring.method_documentation}
                  </p>
                </div>

                <div className="rounded-xl bg-surface border border-line/60 p-3 text-right">
                  <span className="text-[10px] text-mute uppercase font-semibold block">Questions</span>
                  <span className="font-display text-lg font-bold text-ink">
                    {report.attempted_count} / {report.question_count}
                  </span>
                  <span className="text-[10px] text-mute block">Attempted</span>
                </div>
              </div>

              {/* Scoring Components Breakdown */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-line/60 pt-4">
                {report.scoring.components.map((comp) => {
                  const isMeasured = comp.status === "measured";
                  return (
                    <div
                      key={comp.name}
                      className={`rounded-xl border p-3 ${
                        isMeasured ? "bg-card border-line" : "bg-surface border-dashed border-line"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-ink">{comp.name}</span>
                        {isMeasured ? (
                          <span className="font-mono text-xs font-bold text-cobalt">
                            {comp.score}/100
                          </span>
                        ) : (
                          <span className="text-[10px] text-mute font-medium">Unmeasured</span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-mute leading-tight">{comp.explanation}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Speaking & Communication Delivery Card */}
            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎙️</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                    Communication & Speaking Delivery
                  </h3>
                </div>
                <Badge tone={report.speaking.measured ? "ok" : "neutral"}>
                  {report.speaking.measured ? "Audio Measured" : "Not Recorded"}
                </Badge>
              </div>

              {report.speaking.measured ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-xl bg-card p-3 border border-line/60">
                      <span className="text-[10px] text-mute uppercase font-semibold">Speaking Pace</span>
                      <p className="font-display text-lg font-bold text-ink">
                        {report.speaking.average_wpm} <span className="text-xs font-normal">WPM</span>
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 capitalize">
                        {report.speaking.pacing_category} pacing
                      </span>
                    </div>
                    <div className="rounded-xl bg-card p-3 border border-line/60">
                      <span className="text-[10px] text-mute uppercase font-semibold">Pause / Silence</span>
                      <p className="font-display text-lg font-bold text-ink">
                        {report.speaking.average_silence_percentage}%
                      </p>
                      <span className="text-[10px] text-mute">Acoustic pauses</span>
                    </div>
                    <div className="rounded-xl bg-card p-3 border border-line/60">
                      <span className="text-[10px] text-mute uppercase font-semibold">Filler Words</span>
                      <p className="font-display text-lg font-bold text-ink">
                        {report.speaking.total_filler_count}
                      </p>
                      <span className="text-[10px] text-mute">
                        {report.speaking.filler_frequency_per_minute}/min frequency
                      </span>
                    </div>
                    <div className="rounded-xl bg-card p-3 border border-line/60">
                      <span className="text-[10px] text-mute uppercase font-semibold">Benchmark</span>
                      <p className="font-display text-sm font-semibold text-ink mt-1">120-160 WPM</p>
                      <span className="text-[10px] text-mute">Standard interview</span>
                    </div>
                  </div>
                  {report.speaking.feedback && (
                    <p className="text-xs text-ink/80 leading-relaxed font-medium">
                      💡 {report.speaking.feedback}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-mute leading-relaxed">
                  {report.speaking.feedback}
                </p>
              )}
            </div>

            {/* Strengths & {t("dashboard.report.recommendations")} */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span>✓</span> Demonstrated Strengths
                </h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-emerald-950/90 leading-relaxed">
                  {report.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span>⚡</span> {t("dashboard.report.improvements")}
                </h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-amber-950/90 leading-relaxed">
                  {report.areas_for_improvement.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* {t("dashboard.report.recommendations")} */}
            {report.actionable_recommendations.length > 0 && (
              <div className="rounded-2xl border border-line bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cobalt">
                  {t("dashboard.report.recommendations")} for Next Practice
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-ink/80 leading-relaxed">
                  {report.actionable_recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cobalt font-bold">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Questions & Answers Breakdown */}
            <div>
              <h3 className="font-display text-xl text-ink">Question-by-Question Assessment</h3>
              <p className="text-xs text-mute mt-0.5">
                Review your response, 6-dimension scores, and missing concepts for each question.
              </p>

              <div className="mt-4 space-y-3">
                {report.questions.map((q) => {
                  const isOpen = expandedQuestion === q.question_id;
                  return (
                    <div key={q.question_id} className="rounded-2xl border border-line bg-card overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedQuestion(isOpen ? null : q.question_id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/50 transition"
                      >
                        <div className="pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-cobalt">
                              Question {q.position}
                            </span>
                            <span className="text-xs text-mute capitalize">· {q.category}</span>
                            {q.is_answered ? (
                              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                                Answered
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                                Skipped
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-ink line-clamp-1">{q.question_text}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {q.overall_score !== null && (
                            <span className="rounded-full bg-cobalt/10 px-3 py-1 font-mono text-xs font-bold text-cobalt">
                              {q.overall_score}/100
                            </span>
                          )}
                          <span className="text-xs text-mute">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-line p-5 bg-surface/30 space-y-4">
                          <p className="text-xs text-ink/70">
                            <strong>Full Question:</strong> {q.question_text}
                          </p>

                          {q.rationale && (
                            <p className="text-xs text-mute">
                              <strong>Evaluation focus:</strong> {q.rationale}
                            </p>
                          )}

                          <div className="rounded-xl bg-card p-3.5 border border-line">
                            <span className="text-[10px] font-semibold text-mute uppercase tracking-wider block">
                              Candidate Transcript:
                            </span>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink/80">
                              {q.answer_text || "No response recorded."}
                            </p>
                          </div>

                          {/* 6 Dimensions Grid */}
                          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {([
                              ["Relevance", q.relevance],
                              ["Technical Correctness", q.technical_correctness || q.relevance],
                              ["Completeness", q.completeness],
                              ["Clarity", q.clarity],
                              ["Use of Examples", q.use_of_examples],
                              ["Structure", q.structure],
                            ] as const).map(([label, dim]) => (
                              <div key={label} className="rounded-xl bg-card p-3 border border-line/60">
                                <div className="flex justify-between items-center text-xs font-semibold text-ink">
                                  <span>{label}</span>
                                  <span className="text-cobalt font-mono">
                                    {dim?.score !== undefined ? `${dim.score}/100` : "—"}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-[11px] text-ink/70 leading-relaxed">
                                  {dim?.feedback || "Not evaluated."}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Missing Concepts */}
                          {q.missing_concepts && q.missing_concepts.length > 0 && (
                            <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3">
                              <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                                Recommended Concepts to Include:
                              </span>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {q.missing_concepts.map((concept) => (
                                  <span
                                    key={concept}
                                    className="rounded bg-card border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs text-amber-900 dark:text-amber-200 font-medium"
                                  >
                                    + {concept}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Better Answer Suggestion */}
                          {q.better_answer_suggestion && (
                            <div className="rounded-xl bg-card border border-line p-3">
                              <span className="text-[11px] font-semibold text-cobalt uppercase tracking-wider">
                                Suggested Answer Structure:
                              </span>
                              <p className="mt-1 text-xs text-ink/80 leading-relaxed">
                                {q.better_answer_suggestion}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <Button variant="outline" onClick={onClose}>
                {t("dashboard.report.close")}
              </Button>
              <ButtonLink href="/interview">
                Start Another Interview →
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

