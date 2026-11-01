"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useIsClient, useSession } from "@/hooks/useSession";
import { Button } from "@/components/Button";
import { Container, Eyebrow } from "@/components/Container";
import { ArrowRight } from "@/components/Icons";
import { TextField } from "@/components/forms/Field";
import { MAX_RESUME_MB, siteConfig } from "@/lib/site";
import { validateResumeFile } from "@/lib/validation";
import {
  generateQuestions,
  getActiveInterviewSession,
  parseResume,
  type GeneratedQuestions,
  type PersistedInterviewSession,
  type ResumeProfile,
} from "@/services/api";
import { InterviewRoom } from "@/features/interview/InterviewRoom";
import { useTranslation } from "@/features/i18n/LanguageContext";

const ROLE_PRESETS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
];

const categoryLabels: Record<string, string> = {
  technical: "Technical",
  project: "Project deep dive",
  experience: "Experience",
  hr: "HR & behavioural",
};

export function InterviewSetup() {
  const ready = useIsClient();
  const session = useSession();
  const router = useRouter();

  // Configuration state
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"entry" | "mid" | "senior">("mid");
  const [interviewType, setInterviewType] = useState<"technical" | "hr" | "mixed">("mixed");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [interviewLanguage, setInterviewLanguage] = useState<"en" | "hi" | "te">("en");
  const { t } = useTranslation();
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Resume state
  const [file, setFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);

  // Generation & session state
  const [errors, setErrors] = useState<{ role?: string; file?: string }>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<GeneratedQuestions | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Active / Interrupted session resumption
  const [activeSession, setActiveSession] = useState<PersistedInterviewSession | null>(null);
  const [resumingSession, setResumingSession] = useState<PersistedInterviewSession | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (session.role === "admin") router.replace("/admin");
  }, [ready, session, router]);

  // Check for existing in-progress session to resume
  useEffect(() => {
    if (!ready || !session || session.role !== "student") return;
    getActiveInterviewSession()
      .then((active) => {
        if (active && active.status === "in_progress") {
          setActiveSession(active);
        }
      })
      .catch(() => {
        // Silently continue if active check fails
      });
  }, [ready, session]);

  async function onParseResume() {
    if (!file) return;
    const fileError = validateResumeFile(file, MAX_RESUME_MB);
    if (fileError) {
      setErrors((prev) => ({ ...prev, file: fileError }));
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const parsed = await parseResume(file);
      setProfile(parsed);
      setErrors((prev) => ({ ...prev, file: undefined }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse resume.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = {
      role: role.trim() ? undefined : "Please enter or select a target role.",
      file: file ? validateResumeFile(file, MAX_RESUME_MB) : undefined,
    };
    setErrors(nextErrors);
    setErrorMessage("");
    setResult(null);

    if (nextErrors.role || nextErrors.file) return;

    setLoading(true);
    try {
      let currentProfile = profile;
      if (file && !currentProfile) {
        currentProfile = await parseResume(file);
        setProfile(currentProfile);
      }

      const generated = await generateQuestions({
        target_role: role.trim(),
        experience_level: experienceLevel,
        interview_type: interviewType,
        difficulty: difficulty,
        language: interviewLanguage,
        question_count: questionCount,
        skills: currentProfile?.skills ?? [],
        project_mentions: currentProfile?.project_mentions ?? [],
        experience_mentions: currentProfile?.experience_mentions ?? [],
      });
      setResult(generated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setErrorMessage(
        /fetch|network|failed to fetch/i.test(message)
          ? `Could not reach the Oracy API at ${siteConfig.apiBaseUrl}. Ensure the backend is running.`
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !session || session.role !== "student") {
    return <main className="min-h-svh bg-paper" aria-busy="true" />;
  }

  // Active / Resumed Interview Room
  if (resumingSession) {
    return (
      <InterviewRoom
        existingSession={resumingSession}
        onExit={() => {
          setResumingSession(null);
          // Re-check active session
          getActiveInterviewSession().then(setActiveSession).catch(() => undefined);
        }}
      />
    );
  }

  // Fresh Generated Interview Room
  if (result && sessionStarted) {
    return (
      <InterviewRoom
        result={result}
        interviewLanguage={interviewLanguage}
        onExit={() => {
          setSessionStarted(false);
          getActiveInterviewSession().then(setActiveSession).catch(() => undefined);
        }}
      />
    );
  }

  return (
    <Container className="pb-28 pt-32 md:pt-40">
      <Eyebrow>Interview preparation</Eyebrow>
      <h1 className="mt-6 max-w-3xl font-display text-display">
        Configure your <span className="italic text-cobalt">interview.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-ink/65">
        Tailor the interview role, depth, format, and difficulty. Upload your resume so the questions probe your actual projects and technical stack.
      </p>

      {/* Interrupted Session Banner */}
      {activeSession && (
        <aside
          role="region"
          aria-label="Active session banner"
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cobalt/30 bg-cobalt/5 p-6 shadow-sm"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cobalt animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-widest text-cobalt">
                Interrupted Session in Progress
              </p>
            </div>
            <h2 className="mt-1 font-display text-xl text-ink">
              Resume your interview for {activeSession.target_role}
            </h2>
            <p className="mt-1 text-sm text-sub">
              {activeSession.answered_count} of {activeSession.question_count} questions answered · Created {new Date(activeSession.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setResumingSession(activeSession)}
            >
              Resume Interview →
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveSession(null)}
            >
              Dismiss
            </Button>
          </div>
        </aside>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        {/* Configuration Form */}
        <form onSubmit={onSubmit} noValidate className="space-y-8 lg:col-span-7">
          {/* 1. Target Role Selection */}
          <section className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-mute">
              1. Target Role
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRole(preset)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    role === preset
                      ? "bg-cobalt text-white shadow-sm"
                      : "border border-line bg-card text-ink/75 hover:border-cobalt hover:text-cobalt"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <TextField
              label="Custom Job Title / Target Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              error={errors.role}
              placeholder="e.g. Senior Distributed Systems Engineer"
            />
          </section>

          {/* Interview Practice Language */}
          <section className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-mute">
              {t("interview.setup.interviewLanguageLabel")}
            </label>
            <p className="text-xs text-sub">
              {t("interview.setup.interviewLanguageHelp")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "en", label: "English", sub: "Global Technical Standard" },
                { id: "hi", label: "हिन्दी (Hindi)", sub: "मानक हिन्दी प्रश्न एवं मूल्यांकन" },
                { id: "te", label: "తెలుగు (Telugu)", sub: "ప్రామాణిక తెలుగు ప్రశ్నలు & మూల్యాంకనం" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInterviewLanguage(opt.id as "en" | "hi" | "te")}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    interviewLanguage === opt.id
                      ? "border-cobalt bg-cobalt/5 ring-1 ring-cobalt"
                      : "border-line bg-card hover:border-cobalt/50"
                  }`}
                >
                  <p className="font-medium text-xs text-ink">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] text-mute">{opt.sub}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 2. Experience Level */}
          <section className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-mute">
              2. Experience Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "entry", label: "Entry Level", sub: "0–2 years" },
                { id: "mid", label: "Mid Level", sub: "3–5 years" },
                { id: "senior", label: "Senior Level", sub: "5+ years" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExperienceLevel(opt.id as "entry" | "mid" | "senior")}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    experienceLevel === opt.id
                      ? "border-cobalt bg-cobalt/5 ring-1 ring-cobalt"
                      : "border-line bg-card hover:border-cobalt/50"
                  }`}
                >
                  <p className="font-medium text-xs text-ink">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] text-mute">{opt.sub}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 3. Interview Focus & Difficulty */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Interview Type */}
            <section className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-mute">
                3. Interview Format
              </label>
              <div className="space-y-2">
                {[
                  { id: "mixed", label: "Mixed (Technical + HR)", desc: "Balanced round" },
                  { id: "technical", label: "Technical Only", desc: "CS, code & architecture" },
                  { id: "hr", label: "HR & Behavioural Only", desc: "STAR method & culture" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInterviewType(opt.id as "technical" | "hr" | "mixed")}
                    className={`block w-full rounded-xl border p-3 text-left transition ${
                      interviewType === opt.id
                        ? "border-cobalt bg-cobalt/5 ring-1 ring-cobalt"
                        : "border-line bg-card hover:border-cobalt/50"
                    }`}
                  >
                    <p className="text-xs font-medium text-ink">{opt.label}</p>
                    <p className="text-[11px] text-mute">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Difficulty */}
            <section className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-mute">
                4. Difficulty Level
              </label>
              <div className="space-y-2">
                {[
                  { id: "easy", label: "Easy", desc: "Core principles & fundamentals" },
                  { id: "medium", label: "Medium", desc: "Standard realistic interview" },
                  { id: "hard", label: "Hard", desc: "Edge cases, scale & concurrency" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDifficulty(opt.id as "easy" | "medium" | "hard")}
                    className={`block w-full rounded-xl border p-3 text-left transition ${
                      difficulty === opt.id
                        ? "border-cobalt bg-cobalt/5 ring-1 ring-cobalt"
                        : "border-line bg-card hover:border-cobalt/50"
                    }`}
                  >
                    <p className="text-xs font-medium text-ink">{opt.label}</p>
                    <p className="text-[11px] text-mute">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* 5. Question Count */}
          <section className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-mute">
              5. Number of Questions
            </label>
            <div className="flex flex-wrap gap-2">
              {[3, 5, 8, 10, 12].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`h-9 min-w-[44px] rounded-xl px-3 text-xs font-semibold transition ${
                    questionCount === count
                      ? "bg-cobalt text-white shadow-sm"
                      : "border border-line bg-card text-ink/75 hover:border-cobalt"
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>
          </section>

          {/* 6. Resume Upload (Optional but Recommended) */}
          <section className="space-y-3 rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center justify-between">
              <label htmlFor="resume" className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">
                Resume (PDF or DOCX, up to {MAX_RESUME_MB} MB)
              </label>
              {profile && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  ✓ Profile Parsed
                </span>
              )}
            </div>
            <input
              id="resume"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const nextFile = e.target.files?.[0] ?? null;
                setFile(nextFile);
                setProfile(null);
              }}
              aria-invalid={errors.file ? true : undefined}
              className="block w-full rounded-xl border border-dashed border-cobalt/30 bg-card p-4 text-xs text-ink/75 file:mr-4 file:rounded-full file:border-0 file:bg-cobalt file:px-3.5 file:py-1.5 file:text-xs file:font-medium file:text-white"
            />
            {errors.file && <p className="text-xs text-red-600">{errors.file}</p>}

            {file && !profile && (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={onParseResume}
              >
                {loading ? "Reading resume…" : "Extract Profile from Resume"}
              </Button>
            )}

            {profile && (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <p className="text-xs font-medium text-ink">Detected Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.length > 0 ? (
                    profile.skills.map((s) => (
                      <span key={s} className="rounded-full bg-cobalt/10 px-2.5 py-1 text-xs text-cobalt font-medium">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-mute">No common skill keywords detected.</span>
                  )}
                </div>
                {profile.project_mentions.length > 0 && (
                  <p className="text-xs text-mute">
                    Projects found: <strong className="text-ink">{profile.project_mentions[0]}</strong>
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Submit Action */}
          <div className="pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Generating tailored questions…" : <>Generate Interview Questions <ArrowRight /></>}
            </Button>
          </div>

          {errorMessage && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              <strong>Unable to generate questions:</strong>
              <p className="mt-1">{errorMessage}</p>
            </div>
          )}

          {/* Generated Questions Preview */}
          {result && (
            <section aria-live="polite" className="space-y-6 rounded-2xl border border-line bg-card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Eyebrow>Interview Questions Ready</Eyebrow>
                  <h2 className="mt-2 font-display text-2xl text-ink">
                    {result.questions.length} questions for {result.target_role}
                  </h2>
                </div>
                {result.generation_method === "ai_generated" ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    ✨ AI Generated ({result.model_name || "LLM"})
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    ⚡ Deterministic Template Baseline
                  </span>
                )}
              </div>

              <div className="rounded-xl bg-card p-4 border border-line flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-sub">
                  Target: <strong className="text-ink capitalize">{result.target_role}</strong> · Format: <strong className="text-ink capitalize">{result.interview_type}</strong> · Difficulty: <strong className="text-ink capitalize">{result.difficulty}</strong>
                </div>
                <Button type="button" onClick={() => setSessionStarted(true)}>
                  Start Practice Interview →
                </Button>
              </div>

              <ol className="space-y-4">
                {result.questions.map((question, index) => (
                  <li key={question.id} className="rounded-xl border border-line bg-card p-4 md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-cobalt/10 px-2.5 py-0.5 text-xs font-semibold text-cobalt">
                        {categoryLabels[question.category] ?? question.category}
                      </span>
                      <span className="text-xs text-mute font-mono">Q{index + 1}</span>
                    </div>
                    <p className="mt-3 font-medium text-ink">{question.text}</p>
                    {question.rationale && (
                      <p className="mt-2 text-xs leading-relaxed text-ink/60">
                        <strong className="text-ink/80">Why it matters:</strong> {question.rationale}
                      </p>
                    )}
                  </li>
                ))}
              </ol>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={() => setSessionStarted(true)}>
                  Start Practice Interview <ArrowRight />
                </Button>
              </div>
            </section>
          )}
        </form>

        {/* Sidebar Context */}
        <aside className="h-fit rounded-3xl border border-line bg-card p-8 lg:col-span-5 space-y-6">
          <div>
            <h2 className="font-display text-title">How Oracy prepares questions</h2>
            <ol className="mt-4 space-y-4 text-xs leading-relaxed text-ink/70">
              <li>
                <strong className="text-ink">1. Context analysis.</strong> Your selected role, experience level, and uploaded resume skills/projects guide the generation.
              </li>
              <li>
                <strong className="text-ink">2. Deep role relevance.</strong> Questions probe technical depth, architecture, problem-solving, and STAR behavioral situations.
              </li>
              <li>
                <strong className="text-ink">3. AI + Transparent Fallback.</strong> Uses configured LLMs when available; otherwise generates explainable role-based templates.
              </li>
              <li>
                <strong className="text-ink">4. Interruption safe.</strong> Progress is saved on the fly so you can pause and resume practice anytime.
              </li>
            </ol>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-mute">API Configuration</h3>
            <p className="mt-2 text-xs text-sub break-all font-mono text-cobalt">
              {siteConfig.apiBaseUrl}
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
