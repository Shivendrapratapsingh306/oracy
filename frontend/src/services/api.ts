import { siteConfig } from "@/lib/site";
import { authHeaders } from "@/services/auth";

export type ResumeProfile = {
  skills: string[];
  education_mentions: string[];
  experience_mentions: string[];
  project_mentions: string[];
  character_count: number;
};

export type InterviewQuestion = {
  id: string;
  category: "technical" | "project" | "experience" | "hr";
  text: string;
  rationale: string;
};

export type GeneratedQuestions = {
  target_role: string;
  experience_level?: "entry" | "mid" | "senior";
  interview_type?: "technical" | "hr" | "mixed";
  difficulty?: "easy" | "medium" | "hard";
  generation_method: "ai_generated" | "rule_based_baseline";
  model_name?: string | null;
  questions: InterviewQuestion[];
};

export type FillerWordDetail = {
  word: string;
  count: number;
  context_examples: string[];
  is_filler: boolean;
  explanation: string;
};

export type SpeakingMetrics = {
  duration_seconds: number;
  word_count: number;
  speaking_rate_wpm: number;
  speaking_rate_category: "slow" | "optimal" | "fast" | "unmeasured";
  total_pause_duration_seconds: number;
  silence_percentage: number;
  filler_word_count: number;
  filler_word_frequency_per_minute: number;
  filler_words: FillerWordDetail[];
  limitations: string[];
  overall_pacing_feedback: string;
};

export type EvaluationDimension = {
  score: number;
  feedback: string;
};

export type EvaluatedAnswer = {
  question_id: string;
  question_text: string;
  category: InterviewQuestion["category"];
  word_count: number;
  overall_score: number;
  relevance: EvaluationDimension;
  technical_correctness?: EvaluationDimension;
  completeness: EvaluationDimension;
  clarity?: EvaluationDimension;
  use_of_examples?: EvaluationDimension;
  structure: EvaluationDimension;
  strengths: string[];
  improvements: string[];
  missing_concepts?: string[];
  better_answer_suggestion?: string;
  speaking_metrics?: SpeakingMetrics | null;
};

export type AnswerEvaluation = {
  target_role: string;
  evaluation_method: string;
  disclaimer: string;
  evaluated_count: number;
  average_score: number;
  results: EvaluatedAnswer[];
};

export type AudioAnswerResponse = {
  question_id: string;
  transcript: string;
  speaking_metrics: SpeakingMetrics;
  evaluation: EvaluatedAnswer;
  session: PersistedInterviewSession;
};

// Report & Analytics Types
export type ScoringComponent = {
  name: string;
  score: number | null;
  weight: number;
  status: "measured" | "unmeasured" | "incomplete";
  explanation: string;
};

export type ScoringBreakdown = {
  overall_score: number | null;
  scoring_method: string;
  method_documentation: string;
  components: ScoringComponent[];
  is_incomplete: boolean;
};

export type SpeakingSummary = {
  measured: boolean;
  average_wpm: number | null;
  average_silence_percentage: number | null;
  total_filler_count: number | null;
  filler_frequency_per_minute: number | null;
  pacing_category: string | null;
  feedback: string | null;
  limitations: string[];
};

export type VisualSummary = {
  measured: boolean;
  face_centering_score: number | null;
  posture_alignment_score: number | null;
  feedback: string | null;
  limitations: string[];
};

export type ReportQuestionDetail = {
  question_id: string;
  position: number;
  category: string;
  question_text: string;
  rationale?: string | null;
  answer_text: string;
  is_answered: boolean;
  overall_score: number | null;
  relevance?: EvaluationDimension | null;
  technical_correctness?: EvaluationDimension | null;
  completeness?: EvaluationDimension | null;
  clarity?: EvaluationDimension | null;
  use_of_examples?: EvaluationDimension | null;
  structure?: EvaluationDimension | null;
  strengths: string[];
  improvements: string[];
  missing_concepts: string[];
  better_answer_suggestion?: string | null;
  speaking_metrics?: SpeakingMetrics | null;
};

export type InterviewReport = {
  session_id: string;
  target_role: string;
  experience_level: string;
  interview_type: string;
  difficulty: string;
  status: "completed" | "in_progress";
  created_at: string;
  completed_at: string | null;
  question_count: number;
  attempted_count: number;
  scoring: ScoringBreakdown;
  speaking: SpeakingSummary;
  visual: VisualSummary;
  strengths: string[];
  areas_for_improvement: string[];
  actionable_recommendations: string[];
  repeated_difficulty_areas: string[];
  questions: ReportQuestionDetail[];
};

export type ScoreTrendPoint = {
  session_id: string;
  date: string;
  target_role: string;
  score: number;
  question_count: number;
};

export type SpeakingTrends = {
  measured_sessions_count: number;
  wpm_trend: number[];
  filler_rate_trend: number[];
  silence_trend: number[];
};

export type ProgressAnalytics = {
  total_sessions: number;
  completed_sessions: number;
  in_progress_sessions: number;
  overall_average_score: number | null;
  has_sufficient_data: boolean;
  data_summary_note: string;
  score_trend: ScoreTrendPoint[];
  dimension_averages: Record<string, number>;
  speaking_trends: SpeakingTrends;
  strongest_areas: string[];
  areas_requiring_practice: string[];
  repeated_difficulty_tags: string[];
};

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return typeof body.detail === "string" ? body.detail : `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function parseResume(file: File): Promise<ResumeProfile> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${siteConfig.apiBaseUrl}/resumes/parse`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function generateQuestions(input: {
  target_role: string;
  skills: string[];
  project_mentions: string[];
  experience_mentions: string[];
  question_count: number;
  experience_level?: "entry" | "mid" | "senior";
  interview_type?: "technical" | "hr" | "mixed";
  difficulty?: "easy" | "medium" | "hard";
  language?: "en" | "hi" | "te";
  resume_text?: string;
}): Promise<GeneratedQuestions> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/questions/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function evaluateAnswers(input: {
  target_role: string;
  answers: Array<{
    question_id: string;
    question_text: string;
    category: InterviewQuestion["category"];
    answer: string;
  }>;
}): Promise<AnswerEvaluation> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/answers/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function analyzeSpeech(
  transcript: string,
  durationSeconds: number = 0
): Promise<SpeakingMetrics> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/audio/analyze-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, duration_seconds: durationSeconds }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function submitAudioAnswer(
  sessionId: string,
  questionId: string,
  audioBlob: Blob,
  durationSeconds: number,
  clientTranscript?: string,
  language: string = "en"
): Promise<AudioAnswerResponse> {
  const form = new FormData();
  form.append("file", audioBlob, "recording.webm");
  form.append("duration_seconds", durationSeconds.toString());
  form.append("language", language);
  if (clientTranscript) {
    form.append("client_transcript", clientTranscript);
  }
  const response = await fetch(
    `${siteConfig.apiBaseUrl}/interviews/${sessionId}/questions/${questionId}/audio-answer`,
    {
      method: "POST",
      headers: authHeaders(),
      body: form,
    }
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${siteConfig.apiBaseUrl}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export type PersistedInterviewSession = {
  id: string;
  target_role: string;
  experience_level?: string | null;
  interview_type?: string | null;
  difficulty?: string | null;
  generation_method?: string | null;
  status: "in_progress" | "completed";
  created_at: string;
  completed_at: string | null;
  question_count: number;
  answered_count: number;
  average_score: number | null;
  questions: Array<{
    id: string;
    category: string | null;
    text: string;
    position: number;
    rationale?: string | null;
    answer: {
      answer: string;
      evaluation_score: number | null;
      evaluation_feedback: Record<string, unknown> | null;
    } | null;
  }>;
};

export async function createInterviewSession(input: GeneratedQuestions): Promise<PersistedInterviewSession> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      target_role: input.target_role,
      experience_level: input.experience_level || "mid",
      interview_type: input.interview_type || "mixed",
      difficulty: input.difficulty || "medium",
      generation_method: input.generation_method || "rule_based_baseline",
      questions: input.questions,
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = await response.json();
  return body.session as PersistedInterviewSession;
}

export async function getActiveInterviewSession(): Promise<PersistedInterviewSession | null> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews/active`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function getInterviewSession(sessionId: string): Promise<PersistedInterviewSession> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews/${sessionId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getInterviewReport(sessionId: string): Promise<InterviewReport> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews/${sessionId}/report`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getProgressAnalytics(): Promise<ProgressAnalytics> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews/analytics/progress`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function saveInterviewAnswer(
  sessionId: string,
  questionId: string,
  answer: string,
  speakingMetrics?: SpeakingMetrics | null
): Promise<void> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews/${sessionId}/answers/${questionId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ answer, speaking_metrics: speakingMetrics }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function completeInterviewSession(sessionId: string): Promise<PersistedInterviewSession> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews/${sessionId}/complete`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getInterviewHistory(): Promise<Array<Omit<PersistedInterviewSession, "questions">>> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/interviews/history`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = await response.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { sessions?: unknown }).sessions)) {
    return (data as { sessions: Array<Omit<PersistedInterviewSession, "questions">> }).sessions;
  }
  return [];
}
