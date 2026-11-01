"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Container, Eyebrow } from "@/components/Container";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/features/i18n/LanguageContext";
import { VisualAnalyzer } from "./vision/VisualAnalyzer";
import { AudioAnswerRecorder } from "./audio/AudioAnswerRecorder";
import {
  completeInterviewSession,
  createInterviewSession,
  evaluateAnswers,
  saveInterviewAnswer,
  type AnswerEvaluation,
  type GeneratedQuestions,
  type PersistedInterviewSession,
  type SpeakingMetrics,
} from "@/services/api";

type Props = {
  result?: GeneratedQuestions | null;
  existingSession?: PersistedInterviewSession | null;
  interviewLanguage?: string;
  onExit: () => void;
};

const categoryLabels: Record<string, string> = {
  technical: "Technical",
  project: "Project deep dive",
  experience: "Experience",
  hr: "HR & behavioural",
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function InterviewRoom({ result, existingSession, interviewLanguage = "en", onExit }: Props) {
  const { t } = useTranslation();
  // Normalize questions list whether created new or resumed
  const initialQuestions = useMemo(() => {
    if (existingSession) {
      return existingSession.questions.map((q) => ({
        id: q.id,
        category: (q.category as "technical" | "project" | "experience" | "hr") || "technical",
        text: q.text,
        rationale: q.rationale || "Evaluates candidate readiness.",
      }));
    }
    return result?.questions ?? [];
  }, [existingSession, result]);

  const targetRole = existingSession?.target_role || result?.target_role || "Candidate";
  const experienceLevel = existingSession?.experience_level || result?.experience_level || "mid";
  const interviewType = existingSession?.interview_type || result?.interview_type || "mixed";
  const difficulty = existingSession?.difficulty || result?.difficulty || "medium";
  const generationMethod = existingSession?.generation_method || result?.generation_method || "rule_based_baseline";

  // Prepopulate answers if resuming an existing session
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (existingSession) {
      const initial: Record<string, string> = {};
      for (const q of existingSession.questions) {
        if (q.answer?.answer) {
          initial[q.id] = q.answer.answer;
        }
      }
      return initial;
    }
    return {};
  });

  // Prepopulate speaking metrics if resuming an existing session
  const [speakingMetricsMap, setSpeakingMetricsMap] = useState<Record<string, SpeakingMetrics>>(() => {
    if (existingSession) {
      const initial: Record<string, SpeakingMetrics> = {};
      for (const q of existingSession.questions) {
        const metrics = (q.answer?.evaluation_feedback as any)?.speaking_metrics;
        if (metrics) {
          initial[q.id] = metrics;
        }
      }
      return initial;
    }
    return {};
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(existingSession?.id || "");

  // Start on first unanswered question if resuming
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (existingSession) {
      const firstUnanswered = existingSession.questions.findIndex(
        (q) => !q.answer?.answer || !q.answer.answer.trim()
      );
      return firstUnanswered >= 0 ? firstUnanswered : 0;
    }
    return 0;
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState("");
  const [persistenceMessage, setPersistenceMessage] = useState(
    existingSession ? "Active session resumed" : "Initializing session…"
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const sessionPromise = useRef<Promise<string> | null>(null);
  const questionIdMap = useRef<Record<string, string>>({});

  // Timer
  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setElapsedSeconds((sec) => sec + 1), 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  // Session Initialization: Resume or Create
  useEffect(() => {
    if (existingSession) {
      sessionPromise.current = Promise.resolve(existingSession.id);
      setActiveSessionId(existingSession.id);
      for (const q of existingSession.questions) {
        questionIdMap.current[q.id] = q.id;
      }
      setPersistenceMessage("Active session resumed from database");
      return;
    }

    if (result) {
      sessionPromise.current = createInterviewSession(result)
        .then((session) => {
          setActiveSessionId(session.id);
          result.questions.forEach((item, index) => {
            questionIdMap.current[item.id] = session.questions[index]?.id ?? "";
          });
          setPersistenceMessage("Session saved to database");
          return session.id;
        })
        .catch((error) => {
          setPersistenceMessage(
            error instanceof Error ? `Session storage unavailable: ${error.message}` : "Session storage unavailable"
          );
          throw error;
        });

      sessionPromise.current.catch(() => undefined);
    }
  }, [existingSession, result]);

  // Save current question's answer to the database
  async function persistAnswer(qId: string, textToSave: string) {
    if (!sessionPromise.current) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      const sessId = await sessionPromise.current;
      const dbQuestionId = questionIdMap.current[qId] || qId;
      if (dbQuestionId) {
        await saveInterviewAnswer(sessId, dbQuestionId, textToSave, speakingMetricsMap[qId] || null);
      }
      setSaveStatus("saved");
      setPersistenceMessage("Answer saved to database");
    } catch (error) {
      setSaveStatus("unsaved");
      setPersistenceMessage(error instanceof Error ? `Could not save: ${error.message}` : "Could not save answer");
    } finally {
      setSaving(false);
    }
  }

  // Safe question navigation (persists current draft before switching)
  async function navigateToQuestion(newIndex: number) {
    if (newIndex < 0 || newIndex >= initialQuestions.length) return;
    const currentQ = initialQuestions[currentIndex];
    if (currentQ) {
      const currentText = answers[currentQ.id] ?? "";
      await persistAnswer(currentQ.id, currentText);
    }
    setCurrentIndex(newIndex);
  }

  const currentQuestion = initialQuestions[currentIndex];

  const answeredCount = useMemo(() => {
    return initialQuestions.filter((item) => (answers[item.id] ?? "").trim().length > 0).length;
  }, [answers, initialQuestions]);

  async function finishInterview() {
    // Check if any answers remain unpersisted
    if (currentQuestion) {
      await persistAnswer(currentQuestion.id, answers[currentQuestion.id] ?? "");
    }

    setEvaluating(true);
    setEvaluationError("");
    try {
      if (sessionPromise.current) {
        const sessId = await sessionPromise.current;
        // Ensure all answers are saved
        for (const item of initialQuestions) {
          const qId = questionIdMap.current[item.id] || item.id;
          if (qId) {
            await saveInterviewAnswer(
              sessId,
              qId,
              answers[item.id] ?? "",
              speakingMetricsMap[item.id] || null
            );
          }
        }
        const completed = await completeInterviewSession(sessId);
        setPersistenceMessage("Interview session successfully completed and saved");

        // Use the completed session's evaluated answers if present
        const persistedResults = completed.questions
          .filter((q) => q.answer?.evaluation_feedback)
          .map((q) => q.answer!.evaluation_feedback as any);

        if (persistedResults.length > 0) {
          setEvaluation({
            target_role: targetRole,
            evaluation_method: "ai_multidimensional_evaluation",
            disclaimer:
              "Practice feedback only. These evaluations are model-generated coaching estimates and not authoritative hiring decisions.",
            evaluated_count: persistedResults.length,
            average_score: completed.average_score || 0,
            results: persistedResults,
          });
        }
      }
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? `History save error: ${error.message}` : "History save error");
    }

    // Fallback answer evaluation calculation if not already set from completed session
    try {
      const evaluated = await evaluateAnswers({
        target_role: targetRole,
        answers: initialQuestions.map((item) => ({
          question_id: item.id,
          question_text: item.text,
          category: item.category,
          answer: answers[item.id] ?? "",
        })),
      });
      setEvaluation(evaluated);
    } catch (error) {
      if (!evaluation) {
        setEvaluationError(error instanceof Error ? error.message : "Could not evaluate answers.");
      }
    } finally {
      setEvaluating(false);
      setFinished(true);
    }
  }

  // Completed Review Screen
  if (finished) {
    return (
      <Container className="pb-28 pt-32 md:pt-40">
        <Eyebrow>Interview session complete</Eyebrow>
        <h1 className="mt-5 max-w-3xl font-display text-display">
          Great job. <span className="italic text-cobalt">Review your interview.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink/65">
          You completed a practice session for <strong className="text-ink">{targetRole}</strong>. {persistenceMessage}.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-mute">Role & Level</p>
            <p className="mt-2 font-display text-xl">{targetRole}</p>
            <p className="text-xs text-mute capitalize">{experienceLevel} · {difficulty}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-mute">Questions</p>
            <p className="mt-2 font-display text-3xl">{initialQuestions.length}</p>
            <p className="text-xs text-mute capitalize">{interviewType} format</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-mute">Answered</p>
            <p className="mt-2 font-display text-3xl">
              {answeredCount} <span className="text-lg text-mute">/ {initialQuestions.length}</span>
            </p>
            <p className="text-xs text-mute">{answeredCount === initialQuestions.length ? "All completed" : `${initialQuestions.length - answeredCount} skipped`}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-mute">Elapsed Time</p>
            <p className="mt-2 font-display text-3xl">{formatTime(elapsedSeconds)}</p>
            <p className="text-xs text-mute">Practice duration</p>
          </div>
        </div>

        {evaluation && (
          <section className="mt-8 rounded-3xl border border-line bg-card p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow>Practice feedback · 6-dimensional evaluation</Eyebrow>
                <h2 className="mt-3 font-display text-3xl">
                  Estimated score: <span className="text-cobalt">{evaluation.average_score}/100</span>
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/60">{evaluation.disclaimer}</p>
              </div>
              <div className="rounded-2xl bg-cobalt/10 px-4 py-3 text-sm text-cobalt font-medium">
                {evaluation.evaluated_count} answers evaluated
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {evaluation.results.map((item, index) => {
                const metrics = item.speaking_metrics || speakingMetricsMap[item.question_id];

                return (
                  <article key={item.question_id} className="rounded-2xl border border-line p-6 bg-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-cobalt">
                          Question {index + 1} · {categoryLabels[item.category] ?? item.category}
                        </p>
                        <h3 className="mt-2 font-medium text-lg text-ink">{item.question_text}</h3>
                      </div>
                      <div className="rounded-full bg-cobalt/10 px-4 py-2 text-base font-bold text-cobalt">
                        {item.overall_score}/100
                      </div>
                    </div>

                    {/* 6 Core Dimensions Grid */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {([
                        ["Relevance", item.relevance],
                        ["Technical Correctness", item.technical_correctness || item.relevance],
                        ["Completeness", item.completeness],
                        ["Clarity", item.clarity || { score: 75, feedback: "Direct and intelligible response." }],
                        ["Use of Examples", item.use_of_examples || { score: 70, feedback: "Supports core points." }],
                        ["Structure", item.structure],
                      ] as const).map(([label, dimension]) => (
                        <div key={label} className="rounded-xl bg-white p-3.5 border border-line/60">
                          <div className="flex justify-between gap-2 text-xs font-semibold">
                            <span>{label}</span>
                            <span className="text-cobalt font-mono">{dimension.score}/100</span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-ink/70">{dimension.feedback}</p>
                        </div>
                      ))}
                    </div>

                    {/* Speech Delivery Metrics if present */}
                    {metrics && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                            Speech Delivery & Speaking Pacing
                          </span>
                          <span className="text-xs font-medium text-emerald-800 uppercase">
                            {metrics.speaking_rate_category} PACING
                          </span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="rounded-lg bg-white p-2.5 border border-emerald-100">
                            <span className="text-[10px] text-mute uppercase font-semibold">Pacing</span>
                            <p className="font-display text-base font-semibold text-emerald-950">
                              {metrics.speaking_rate_wpm} <span className="text-xs font-normal">WPM</span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-emerald-100">
                            <span className="text-[10px] text-mute uppercase font-semibold">Pauses / Silence</span>
                            <p className="font-display text-base font-semibold text-emerald-950">
                              {metrics.silence_percentage}%
                            </p>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-emerald-100">
                            <span className="text-[10px] text-mute uppercase font-semibold">Filler Words</span>
                            <p className="font-display text-base font-semibold text-emerald-950">
                              {metrics.filler_word_count}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-emerald-100">
                            <span className="text-[10px] text-mute uppercase font-semibold">Speech Duration</span>
                            <p className="font-display text-base font-semibold text-emerald-950">
                              {metrics.duration_seconds}s
                            </p>
                          </div>
                        </div>
                        {metrics.overall_pacing_feedback && (
                          <p className="mt-2.5 text-xs text-emerald-900/80 leading-relaxed font-medium">
                            💡 {metrics.overall_pacing_feedback}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Missing Concepts */}
                    {item.missing_concepts && item.missing_concepts.length > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                          Recommended Concepts to Address:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.missing_concepts.map((concept) => (
                            <span
                              key={concept}
                              className="rounded-md bg-white border border-amber-200 px-2.5 py-1 text-xs text-amber-900 font-medium"
                            >
                              + {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Better Answer Suggestion */}
                    {item.better_answer_suggestion && (
                      <div className="mt-4 rounded-xl border border-line bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-cobalt">
                          Actionable Answer Improvement:
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink/80">
                          {item.better_answer_suggestion}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {item.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Strengths</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink/80">
                            {item.strengths.map((str) => (
                              <li key={str}>{str}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.improvements.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Areas to Improve</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink/80">
                            {item.improvements.map((imp) => (
                              <li key={imp}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {evaluationError && (
          <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <strong>Evaluation note:</strong>
            <p className="mt-1">{evaluationError}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={() => onExit()}>
            Back to Interview Setup
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowAllQuestions((shown) => !shown)}>
            {showAllQuestions ? "Hide answer transcript" : "Review my answers"}
          </Button>
        </div>

        {showAllQuestions && (
          <ol className="mt-8 space-y-4">
            {initialQuestions.map((item, index) => (
              <li key={item.id} className="rounded-2xl border border-line bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-cobalt">
                  Question {index + 1} · {categoryLabels[item.category] ?? item.category}
                </p>
                <h2 className="mt-3 font-medium">{item.text}</h2>
                <div className="mt-4 rounded-xl bg-white p-4 border border-line">
                  <p className="text-xs font-semibold text-mute uppercase tracking-widest">Candidate Answer:</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                    {(answers[item.id] ?? "").trim() || "No answer provided for this question."}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Container>
    );
  }

  if (!currentQuestion) {
    return (
      <Container className="pb-28 pt-32 md:pt-40">
        <p className="text-center text-sub">No interview questions loaded.</p>
        <div className="mt-6 text-center">
          <Button onClick={onExit}>Return to Setup</Button>
        </div>
      </Container>
    );
  }

  const progress = Math.round(((currentIndex + 1) / initialQuestions.length) * 100);

  return (
    <Container className="pb-28 pt-32 md:pt-40">
      {/* Session Topbar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>Practice interview</Eyebrow>
            <span className="rounded-full bg-cobalt/10 px-2.5 py-0.5 text-xs font-medium text-cobalt">
              {targetRole}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 capitalize">
              {experienceLevel} · {difficulty}
            </span>
            {generationMethod === "ai_generated" ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                AI Generated
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                Template Questions
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-display">
            Take your <span className="italic text-cobalt">time.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector compact />
            <ThemeToggle />
          <span className="text-xs text-mute">
            {saveStatus === "saving" ? (
              <span className="text-cobalt">Saving draft…</span>
            ) : saveStatus === "saved" ? (
              <span className="text-emerald-600">✓ Saved</span>
            ) : (
              <span className="text-amber-600">Unsaved changes</span>
            )}
          </span>
          <div className="rounded-full border border-line bg-card px-4 py-2 text-sm tabular-nums text-ink/70" aria-label="Elapsed time">
            ⏱ {formatTime(elapsedSeconds)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={initialQuestions.length}>
        <div className="h-full rounded-full bg-cobalt transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Question Navigation Pills Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Question selector">
          {initialQuestions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = (answers[q.id] ?? "").trim().length > 0;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => void navigateToQuestion(idx)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                  isCurrent
                    ? "bg-cobalt text-white shadow-sm ring-2 ring-cobalt ring-offset-2"
                    : isAnswered
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "border border-line bg-card text-ink/60 hover:bg-slate-100"
                }`}
                title={`Question ${idx + 1}: ${categoryLabels[q.category] ?? q.category} ${isAnswered ? "(Answered)" : ""}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-mute">
          Question {currentIndex + 1} of {initialQuestions.length} · <strong className="text-ink">{answeredCount}</strong> answered
        </div>
      </div>

      {/* Main Question & Answer Arena */}
      <section className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="rounded-3xl border border-line bg-card p-6 md:p-10 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cobalt/10 px-3 py-1.5 text-xs font-semibold text-cobalt">
              {categoryLabels[currentQuestion.category] ?? currentQuestion.category}
            </span>
            <span className="text-xs text-mute">
              Speak or write your response. Explain clear points, architecture choices, and examples.
            </span>
          </div>

          <h2 className="mt-6 font-display text-2xl leading-tight text-ink md:text-3xl">
            {currentQuestion.text}
          </h2>

          {currentQuestion.rationale && (
            <p className="mt-3 text-sm leading-relaxed text-ink/60">
              <strong className="text-ink/80">Evaluation focus:</strong> {currentQuestion.rationale}
            </p>
          )}

          {/* Audio Answer Recorder Widget */}
          {activeSessionId && (
            <div className="mt-6">
              <AudioAnswerRecorder
                sessionId={activeSessionId}
                language={interviewLanguage}
                questionId={questionIdMap.current[currentQuestion.id] || currentQuestion.id}
                onTranscriptReady={(transcript, metrics) => {
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: transcript }));
                  if (metrics) {
                    setSpeakingMetricsMap((prev) => ({ ...prev, [currentQuestion.id]: metrics }));
                  }
                  setSaveStatus("saved");
                  setPersistenceMessage("Audio answer transcribed and saved");
                }}
              />
            </div>
          )}

          {/* Answer Text Area (Prepopulated by speech-to-text or editable directly) */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label htmlFor="interview-answer" className="block text-xs font-semibold uppercase tracking-[0.14em] text-mute">
                Answer Transcript & Notes
              </label>
              <button
                type="button"
                onClick={() => persistAnswer(currentQuestion.id, answers[currentQuestion.id] ?? "")}
                disabled={saving}
                className="text-xs font-medium text-cobalt hover:underline"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
            </div>
            <textarea
              id="interview-answer"
              value={answers[currentQuestion.id] ?? ""}
              onChange={(event) => {
                const nextVal = event.target.value;
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: nextVal }));
                setSaveStatus("unsaved");
              }}
              onBlur={() => {
                persistAnswer(currentQuestion.id, answers[currentQuestion.id] ?? "");
              }}
              placeholder="Your recorded answer transcript will appear here, or you can type directly…"
              rows={8}
              className="mt-3 w-full resize-y rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-ink outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/15"
            />
            <div className="mt-2 flex justify-between text-xs text-mute">
              <span>Tip: Speak naturally, cite concrete project examples and quantify outcomes.</span>
              <span className="tabular-nums font-mono">
                {(answers[currentQuestion.id] ?? "").trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0 || saving}
              onClick={() => void navigateToQuestion(currentIndex - 1)}
            >
              ← Previous question
            </Button>

            <div className="flex items-center gap-3">
              {currentIndex < initialQuestions.length - 1 ? (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    await persistAnswer(currentQuestion.id, answers[currentQuestion.id] ?? "");
                    setCurrentIndex((curr) => curr + 1);
                  }}
                >
                  {saving ? "Saving…" : "Save & Next question →"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={evaluating || saving}
                  onClick={() => {
                    if (answeredCount < initialQuestions.length) {
                      const confirmFinish = window.confirm(
                        `You have answered ${answeredCount} of ${initialQuestions.length} questions. Do you want to submit your interview?`
                      );
                      if (!confirmFinish) return;
                    }
                    void finishInterview();
                  }}
                >
                  {evaluating ? "Evaluating & completing…" : "Finish interview"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Controls */}
        <aside className="h-fit space-y-6 lg:col-span-5">
          <VisualAnalyzer />

          <div className="rounded-3xl border border-line bg-card p-6">
            <h3 className="font-display text-xl">Speech & Audio Tips</h3>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-ink/70">
              <li>
                <strong className="text-ink">Pacing:</strong> Aim for 120-160 WPM. Take short, natural pauses between key thoughts.
              </li>
              <li>
                <strong className="text-ink">Microphone:</strong> Use a quiet environment. Click &quot;Record Answer&quot;, speak, and review your transcript.
              </li>
              <li>
                <strong className="text-ink">Structured Delivery:</strong> Use Situation → Task → Action → Result or Problem → Approach → Trade-offs.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-line bg-card p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-mute">Interview Parameters</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-sub">Target Role</dt>
                <dd className="font-medium text-ink">{targetRole}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sub">Experience Level</dt>
                <dd className="font-medium text-ink capitalize">{experienceLevel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sub">Interview Type</dt>
                <dd className="font-medium text-ink capitalize">{interviewType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sub">Difficulty</dt>
                <dd className="font-medium text-ink capitalize">{difficulty}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="mt-6 block w-full text-center text-xs font-semibold text-cobalt underline underline-offset-4"
              onClick={async () => {
                if (currentQuestion) {
                  await persistAnswer(currentQuestion.id, answers[currentQuestion.id] ?? "");
                }
                onExit();
              }}
            >
              Save progress & exit to setup
            </button>
          </div>
        </aside>
      </section>
    </Container>
  );
}
