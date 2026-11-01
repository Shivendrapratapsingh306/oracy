/** Illustrative demo shapes. Replace with real API types once endpoints exist. */
export interface DemoSessionRecord {
  id: string;
  label: string;
  role: string;
  score: number;
  focus: string;
}

export interface ScoreComponent {
  key: string;
  label: string;
  score: number;
  evidence: string;
}

export type InterviewKind = "Technical" | "Behavioural" | "Mixed";

/** Illustrative sample interview used only in dashboard sample mode. */
export interface DemoSession {
  id: string;
  daysAgo: number;
  kind: InterviewKind;
  role: string;
  score: number;
  durationMin: number;
  focus: string;
  feedback: string[];
}

export interface DemoSkill {
  key: string;
  label: string;
  score: number;
  evidence: string;
  /** True when the metric is an estimate (e.g. from camera analysis). */
  estimate?: boolean;
}
