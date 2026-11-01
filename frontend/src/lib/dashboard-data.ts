import { demoSkills } from "@/lib/demo-data";

/**
 * Dashboard data layer: FRONTEND-ONLY DEMO PERSISTENCE.
 *
 * There is no backend for profiles, goals or interview sessions yet, so the
 * student's preferences are kept in this browser's localStorage, keyed by the
 * demo-session email. Nothing sensitive is stored: no passwords, no tokens and
 * no resume contents (only the file name and size).
 *
 * "Sample mode" shows clearly labelled illustrative scores and sessions. Real
 * interview records do not exist yet, so none are ever fabricated here.
 */

export type SkillStatus = "gap" | "learning" | "ready";
export const INTERVIEW_TYPES = ["Mixed", "Technical", "Behavioural"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export interface RequiredSkill { id: string; name: string; status: SkillStatus }
export interface Milestone { id: string; label: string; done: boolean }
export interface PlanTask { id: string; title: string; minutes: number; skill: string; doneOn: string | null }

export interface DashboardData {
  version: 1;
  sampleMode: boolean;
  profile: { name: string; college: string; degree: string; gradYear: string; photo: string; resumeName: string; resumeSize: number };
  career: { role: string; companies: string[]; goals: string; deadline: string; skills: RequiredSkill[]; milestones: Milestone[] };
  plan: { tasks: PlanTask[]; dailyMinutes: number; weeklyTasks: number; activity: Record<string, number> };
  settings: { inApp: boolean; practiceReminders: boolean; weeklySummary: boolean; reminderTime: string; interviewType: InterviewType; sessionMinutes: string };
  readNotifications: string[];
}

export const ROLES = ["Backend Engineer", "Frontend Engineer", "Data Analyst", "Machine Learning Engineer", "Product Manager"];
export const SKILL_AREAS = ["Communication", "Answer structure", "Technical knowledge", "Problem-solving", "Confidence & delivery"];
export const SESSION_LENGTHS = ["15", "30", "45", "60"];

const roleSkills: Record<string, string[]> = {
  "backend engineer": ["Data structures & algorithms", "System design", "APIs & databases", "Concurrency basics", "Behavioural (STAR) answers"],
  "frontend engineer": ["JavaScript & TypeScript", "React and component design", "Web performance", "Accessibility", "Behavioural (STAR) answers"],
  "data analyst": ["SQL", "Statistics basics", "Data storytelling", "Spreadsheet & BI tools", "Behavioural (STAR) answers"],
  "machine learning engineer": ["ML fundamentals", "Python & data handling", "Model evaluation", "ML system design", "Behavioural (STAR) answers"],
  "product manager": ["Product sense", "Prioritisation", "Metrics & experiments", "Stakeholder communication", "Behavioural (STAR) answers"],
};
const genericSkills = ["Core concepts for your role", "Problem-solving out loud", "Project storytelling", "Behavioural (STAR) answers"];

export function suggestedSkillsFor(role: string): string[] {
  return roleSkills[role.trim().toLowerCase()] ?? genericSkills;
}

/* ---------- ids and dates ---------- */

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

/** The last `n` local dates, oldest first, ending today. */
export function lastNDays(n: number, today: string = todayISO()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

export function daysUntil(iso: string, today: string = todayISO()): number {
  const a = new Date(`${today}T00:00:00`).getTime();
  const b = new Date(`${iso}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/* ---------- defaults and normalisation ---------- */

export function defaultData(name: string): DashboardData {
  return {
    version: 1,
    sampleMode: false,
    profile: { name, college: "", degree: "", gradYear: "", photo: "", resumeName: "", resumeSize: 0 },
    career: {
      role: "",
      companies: [],
      goals: "",
      deadline: "",
      skills: [],
      milestones: [
        { id: "m1", label: "Complete your profile", done: false },
        { id: "m2", label: "Finish a first mock interview", done: false },
        { id: "m3", label: "Close your top skill gap", done: false },
        { id: "m4", label: "Practise on 5 days in one week", done: false },
        { id: "m5", label: "Complete a full-length mock interview", done: false },
      ],
    },
    plan: {
      tasks: [
        { id: "t1", title: "Answer 3 behavioural questions out loud using STAR", minutes: 15, skill: "Answer structure", doneOn: null },
        { id: "t2", title: "Explain one resume project in two minutes", minutes: 10, skill: "Communication", doneOn: null },
        { id: "t3", title: "Solve one problem and narrate your approach", minutes: 25, skill: "Problem-solving", doneOn: null },
        { id: "t4", title: "Review core concepts for your target role", minutes: 20, skill: "Technical knowledge", doneOn: null },
        { id: "t5", title: "Record a one-minute intro and note filler words", minutes: 10, skill: "Confidence & delivery", doneOn: null },
      ],
      dailyMinutes: 60,
      weeklyTasks: 20,
      activity: {},
    },
    settings: { inApp: true, practiceReminders: false, weeklySummary: false, reminderTime: "18:00", interviewType: "Mixed", sessionMinutes: "30" },
    readNotifications: [],
  };
}

type R = Record<string, unknown>;
const isObj = (v: unknown): v is R => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function list<T>(v: unknown, map: (x: unknown) => T | null, fallback: T[]): T[] {
  if (!Array.isArray(v)) return fallback;
  return v.map(map).filter((x): x is T => x !== null);
}

/** Merge untrusted stored JSON onto defaults so corrupt values never crash the UI. */
export function normalizeData(input: unknown, fallbackName: string): DashboardData {
  const d = defaultData(fallbackName);
  if (!isObj(input)) return d;
  const p = isObj(input.profile) ? input.profile : {};
  const c = isObj(input.career) ? input.career : {};
  const pl = isObj(input.plan) ? input.plan : {};
  const s = isObj(input.settings) ? input.settings : {};
  const photo = str(p.photo);
  const type = str(s.interviewType);
  const activity: Record<string, number> = {};
  if (isObj(pl.activity)) {
    for (const [k, v] of Object.entries(pl.activity)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v >= 0) activity[k] = Math.floor(v);
    }
  }
  return {
    version: 1,
    sampleMode: bool(input.sampleMode, d.sampleMode),
    profile: {
      name: str(p.name, d.profile.name),
      college: str(p.college),
      degree: str(p.degree),
      gradYear: str(p.gradYear),
      photo: photo.startsWith("data:image/") ? photo : "",
      resumeName: str(p.resumeName),
      resumeSize: Math.max(0, num(p.resumeSize, 0)),
    },
    career: {
      role: str(c.role),
      companies: list(c.companies, (x) => (typeof x === "string" && x.trim() ? x.trim() : null), []).slice(0, 8),
      goals: str(c.goals),
      deadline: str(c.deadline),
      skills: list(
        c.skills,
        (x): RequiredSkill | null =>
          isObj(x) && typeof x.id === "string" && typeof x.name === "string" && x.name.trim()
            ? { id: x.id, name: x.name, status: x.status === "ready" || x.status === "learning" ? x.status : "gap" }
            : null,
        d.career.skills,
      ),
      milestones: list(
        c.milestones,
        (x): Milestone | null => (isObj(x) && typeof x.id === "string" && typeof x.label === "string" ? { id: x.id, label: x.label, done: x.done === true } : null),
        d.career.milestones,
      ),
    },
    plan: {
      tasks: list(
        pl.tasks,
        (x): PlanTask | null =>
          isObj(x) && typeof x.id === "string" && typeof x.title === "string" && x.title.trim()
            ? { id: x.id, title: x.title, minutes: clamp(Math.round(num(x.minutes, 15)), 1, 240), skill: str(x.skill, "Communication"), doneOn: typeof x.doneOn === "string" ? x.doneOn : null }
            : null,
        d.plan.tasks,
      ),
      dailyMinutes: clamp(Math.round(num(pl.dailyMinutes, d.plan.dailyMinutes)), 10, 480),
      weeklyTasks: clamp(Math.round(num(pl.weeklyTasks, d.plan.weeklyTasks)), 1, 100),
      activity,
    },
    settings: {
      inApp: bool(s.inApp, true),
      practiceReminders: bool(s.practiceReminders, false),
      weeklySummary: bool(s.weeklySummary, false),
      reminderTime: /^\d{2}:\d{2}$/.test(str(s.reminderTime)) ? str(s.reminderTime) : d.settings.reminderTime,
      interviewType: (INTERVIEW_TYPES as readonly string[]).includes(type) ? (type as InterviewType) : "Mixed",
      sessionMinutes: SESSION_LENGTHS.includes(str(s.sessionMinutes)) ? str(s.sessionMinutes) : "30",
    },
    readNotifications: list(input.readNotifications, (x) => (typeof x === "string" ? x : null), []).slice(-100),
  };
}

/* ---------- browser storage (safe when blocked) ---------- */

const EVENT = "oracy:dashboard-change";
const memory = new Map<string, string>();

export const dashboardKey = (email: string) => `oracy.demo.dashboard.v1:${email.trim().toLowerCase()}`;

export function readDashboardRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

/** Returns false when the browser blocked persistent storage (data then lives only in memory). */
export function writeDashboardRaw(key: string, value: string): boolean {
  memory.set(key, value);
  let persisted = true;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new Event(EVENT));
  return persisted;
}

export function resetDashboard(email: string): void {
  const key = dashboardKey(email);
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeDashboard(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/* ---------- derived values ---------- */

export function profileCompletion(d: DashboardData) {
  const fields: { key: string; label: string; filled: boolean }[] = [
    { key: "photo", label: "Profile photo", filled: !!d.profile.photo },
    { key: "name", label: "Full name", filled: !!d.profile.name.trim() },
    { key: "college", label: "College", filled: !!d.profile.college.trim() },
    { key: "degree", label: "Degree", filled: !!d.profile.degree.trim() },
    { key: "gradYear", label: "Graduation year", filled: !!d.profile.gradYear.trim() },
    { key: "role", label: "Target role", filled: !!d.career.role.trim() },
    { key: "goals", label: "Career goals", filled: !!d.career.goals.trim() },
    { key: "resume", label: "Resume", filled: !!d.profile.resumeName },
  ];
  const filled = fields.filter((f) => f.filled).length;
  return { percent: Math.round((filled / fields.length) * 100), filled, total: fields.length, missing: fields.filter((f) => !f.filled) };
}

export function readinessLabel(score: number): string {
  if (score >= 85) return "Interview ready";
  if (score >= 70) return "Nearly ready";
  if (score >= 55) return "Building momentum";
  return "Getting started";
}

export const taskDone = (t: PlanTask, today: string) => t.doneOn === today;

export function minutesDoneToday(d: DashboardData, today: string): number {
  return d.plan.tasks.filter((t) => taskDone(t, today)).reduce((sum, t) => sum + t.minutes, 0);
}

export function weekTotal(d: DashboardData, today: string): number {
  return lastNDays(7, today).reduce((sum, day) => sum + (d.plan.activity[day] ?? 0), 0);
}

/* ---------- pure updaters ---------- */

export function toggleTask(d: DashboardData, id: string, today: string): DashboardData {
  const t = d.plan.tasks.find((x) => x.id === id);
  if (!t) return d;
  const wasDone = taskDone(t, today);
  const tasks = d.plan.tasks.map((x) => (x.id === id ? { ...x, doneOn: wasDone ? null : today } : x));
  const count = Math.max(0, (d.plan.activity[today] ?? 0) + (wasDone ? -1 : 1));
  return { ...d, plan: { ...d.plan, tasks, activity: { ...d.plan.activity, [today]: count } } };
}

export function addTask(d: DashboardData, task: { title: string; minutes: number; skill: string }): DashboardData {
  return { ...d, plan: { ...d.plan, tasks: [...d.plan.tasks, { id: uid(), title: task.title.trim(), minutes: task.minutes, skill: task.skill, doneOn: null }] } };
}

/* ---------- recommendations and notifications ---------- */

export interface WeakSkill { name: string; score?: number; basis: "sample" | "your data" }

export function weakestSkill(d: DashboardData): WeakSkill | null {
  if (d.sampleMode) {
    const w = [...demoSkills].sort((a, b) => a.score - b.score)[0];
    return { name: w.label, score: w.score, basis: "sample" };
  }
  const gap = d.career.skills.find((s) => s.status === "gap") ?? d.career.skills.find((s) => s.status === "learning");
  return gap ? { name: gap.name, basis: "your data" } : null;
}

export interface NextAction {
  title: string;
  minutes: number;
  skill: string;
  why: string;
  basis: "sample" | "your data" | "starter";
  href: string;
  cta: string;
  plannable: boolean;
}

const taskBySkill: Record<string, { title: string; minutes: number }> = {
  Communication: { title: "Record a 2-minute project explanation and count filler words", minutes: 15 },
  "Answer structure": { title: "Answer 3 behavioural questions out loud using STAR", minutes: 15 },
  "Technical knowledge": { title: "Explain two core concepts for your role out loud", minutes: 20 },
  "Problem-solving": { title: "Talk through one problem, covering edge cases before coding", minutes: 25 },
  "Confidence & delivery": { title: "Practise a one-minute intro to camera, then review pace", minutes: 10 },
};

export function recommendNext(d: DashboardData): NextAction {
  const weak = weakestSkill(d);
  if (weak && weak.basis === "sample") {
    const t = taskBySkill[weak.name] ?? { title: `Practise ${weak.name}`, minutes: 20 };
    return {
      title: t.title,
      minutes: t.minutes,
      skill: weak.name,
      why: `Your lowest displayed score is ${weak.score} in ${weak.name}. Working on your weakest area is the quickest way to lift overall readiness. This score is not from a completed interview.`,
      basis: "sample",
      href: "/interview",
      cta: "Start practice",
      plannable: true,
    };
  }
  if (weak) {
    return {
      title: `Practise ${weak.name}`,
      minutes: 20,
      skill: weak.name,
      why: `You marked ${weak.name} as something to work on${d.career.role ? ` for ${d.career.role}` : ""}. A focused 20-minute session is a good place to start.`,
      basis: "your data",
      href: "/interview",
      cta: "Start practice",
      plannable: true,
    };
  }
  if (!d.career.role.trim()) {
    return {
      title: "Choose your target role",
      minutes: 3,
      skill: "Career goals",
      why: "Your role shapes which skills matter and powers your skill-gap checklist. It takes about three minutes.",
      basis: "starter",
      href: "/dashboard/career",
      cta: "Set target role",
      plannable: false,
    };
  }
  return {
    title: "Take your first mock interview",
    minutes: Number(d.settings.sessionMinutes) || 30,
    skill: "Overall readiness",
    why: "A first session creates your baseline. Nothing is scored until you complete one.",
    basis: "starter",
    href: "/interview",
    cta: "Start mock interview",
    plannable: false,
  };
}

export interface AppNotification { id: string; title: string; body: string; href: string }

export function buildNotifications(d: DashboardData, today: string): AppNotification[] {
  const out: AppNotification[] = [];
  const pending = d.plan.tasks.filter((t) => !taskDone(t, today)).length;
  if (d.plan.tasks.length) {
    out.push(
      pending > 0
        ? { id: `plan-${today}-${pending}`, title: `${pending} practice task${pending === 1 ? "" : "s"} left today`, body: "Open your daily plan to keep your streak going.", href: "/dashboard/plan" }
        : { id: `plan-done-${today}`, title: "Today's plan is complete", body: "Nice work. Come back tomorrow for the next round.", href: "/dashboard/plan" },
    );
  }
  const pc = profileCompletion(d);
  if (pc.percent < 100) {
    out.push({ id: `profile-${pc.filled}`, title: `Profile ${pc.percent}% complete`, body: `Add ${pc.missing[0].label.toLowerCase()} to move closer to 100%.`, href: "/dashboard/profile" });
  }
  if (d.career.deadline) {
    const n = daysUntil(d.career.deadline, today);
    if (n >= 0 && n <= 30) {
      out.push({ id: `deadline-${d.career.deadline}`, title: n === 0 ? "Your preparation deadline is today" : `${n} day${n === 1 ? "" : "s"} to your preparation deadline`, body: "Review your milestones in Career Launchpad.", href: "/dashboard/career" });
    }
  }
  return out;
}
