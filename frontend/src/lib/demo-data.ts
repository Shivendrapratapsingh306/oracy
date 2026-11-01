import type { DemoSession, DemoSessionRecord, DemoSkill, ScoreComponent } from "@/types";

/**
 * ILLUSTRATIVE DEMO DATA ONLY.
 * These numbers are invented to show the interface. They are not results
 * from any real user, model, or validated scoring method.
 */
export const demoOverallScore = 78;

export const demoProgress = [54, 59, 63, 66, 72, 78];

export const demoComponents: ScoreComponent[] = [
  { key: "technical", label: "Technical knowledge", score: 76, evidence: "Covered 4 of 5 expected topics in the system-design answer." },
  { key: "answer", label: "Answer quality", score: 81, evidence: "Clear structure; one answer lacked a concrete example." },
  { key: "communication", label: "Communication", score: 78, evidence: "Steady pace; several filler words in the opening." },
  { key: "presentation", label: "Presentation (estimate)", score: 72, evidence: "Camera framing good; gaze drifted off-screen at times." },
];

export const demoHistory: DemoSessionRecord[] = [
  { id: "s6", label: "Sample session 6", role: "Backend Engineer", score: 78, focus: "Fewer fillers, stronger examples" },
  { id: "s5", label: "Sample session 5", role: "Backend Engineer", score: 72, focus: "Structure answers with STAR" },
  { id: "s4", label: "Sample session 4", role: "Backend Engineer", score: 66, focus: "Slow down in technical answers" },
  { id: "s3", label: "Sample session 3", role: "Data Analyst", score: 63, focus: "Quantify project impact" },
  { id: "s2", label: "Sample session 2", role: "Data Analyst", score: 59, focus: "Reduce long pauses" },
  { id: "s1", label: "Sample session 1", role: "Data Analyst", score: 54, focus: "Answer the question asked" },
];

/** Static bar heights (%) for decorative waveform visuals. */
export const waveBars = [30, 52, 38, 70, 44, 86, 60, 34, 78, 50, 92, 64, 40, 72, 48, 88, 56, 36, 68, 82, 46, 74, 58, 90, 42, 66, 80, 52];

/** Dashboard sample skills. ILLUSTRATIVE ONLY: not produced by any model. */
export const demoSkills: DemoSkill[] = [
  { key: "communication", label: "Communication", score: 78, evidence: "Steady pace; several filler words in the opening." },
  { key: "structure", label: "Answer structure", score: 81, evidence: "Clear structure; one answer lacked a concrete example." },
  { key: "technical", label: "Technical knowledge", score: 76, evidence: "Covered 4 of 5 expected topics in the system-design answer." },
  { key: "problem", label: "Problem-solving", score: 69, evidence: "Reached a working approach but skipped edge cases before coding." },
  { key: "delivery", label: "Confidence & delivery", score: 72, evidence: "Camera framing good; gaze drifted off-screen at times.", estimate: true },
];

/** Dashboard sample sessions, newest first. ILLUSTRATIVE ONLY. */
export const demoSessions: DemoSession[] = [
  { id: "s6", daysAgo: 1, kind: "Mixed", role: "Backend Engineer", score: 78, durationMin: 32, focus: "Fewer fillers, stronger examples", feedback: ["Opening answer had several filler words.", "Add one measurable result to each project story.", "Good structure on the system-design question."] },
  { id: "s5", daysAgo: 4, kind: "Behavioural", role: "Backend Engineer", score: 72, durationMin: 24, focus: "Structure answers with STAR", feedback: ["Situation and task ran long; lead with the action.", "Close each answer with the outcome."] },
  { id: "s4", daysAgo: 8, kind: "Technical", role: "Backend Engineer", score: 66, durationMin: 41, focus: "Slow down in technical answers", feedback: ["Clarify requirements before proposing a design.", "State edge cases aloud before coding."] },
  { id: "s3", daysAgo: 13, kind: "Technical", role: "Data Analyst", score: 63, durationMin: 36, focus: "Quantify project impact", feedback: ["Quantify the impact of your analysis.", "Explain why you chose the method."] },
  { id: "s2", daysAgo: 18, kind: "Behavioural", role: "Data Analyst", score: 59, durationMin: 22, focus: "Reduce long pauses", feedback: ["Pause briefly to think, then start answering.", "Keep answers under two minutes."] },
  { id: "s1", daysAgo: 24, kind: "Mixed", role: "Data Analyst", score: 54, durationMin: 28, focus: "Answer the question asked", feedback: ["Answer the question first, then add context.", "Prepare a 30-second introduction."] },
];
