"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { Icon } from "@/components/dashboard/Icon";
import { Badge, EmptyState, ProgressBar } from "@/components/dashboard/ui";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { demoSessions, demoSkills } from "@/lib/demo-data";
import { lastNDays, taskDone, toggleTask } from "@/lib/dashboard-data";
import type { DemoSession } from "@/types";
import { getInterviewHistory, type PersistedInterviewSession } from "@/services/api";

/* ---------- skills ---------- */

export function skillTone(score: number): "ok" | "blue" | "warn" {
  return score >= 78 ? "ok" : score >= 72 ? "blue" : "warn";
}

/** Sample skill bars. Callers must only render this in sample mode. */
export function SampleSkillBars({ showEvidence = false }: { showEvidence?: boolean }) {
  return (
    <ul className="space-y-5">
      {demoSkills.map((s) => (
        <li key={s.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">
              {s.label}
              {s.estimate && <span className="ml-2 font-normal text-sub">(estimate)</span>}
            </span>
            <span className="font-mono text-ink">{s.score}</span>
          </div>
          <div className="mt-2"><ProgressBar value={s.score} label={`${s.label} score ${s.score} out of 100`} tone={skillTone(s.score)} /></div>
          {showEvidence && <p className="mt-2 text-sm text-sub">{s.evidence}</p>}
        </li>
      ))}
    </ul>
  );
}

export function StrengthsAndFocus() {
  const sorted = [...demoSkills].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 2);
  const focus = sorted.slice(-2).reverse();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-ok/30 bg-ok/5 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">Strengths</p>
        <ul className="mt-2 space-y-1 text-sm text-ink">{strengths.map((s) => <li key={s.key}>{s.label} <span className="font-mono text-sub">· {s.score}</span></li>)}</ul>
      </div>
      <div className="rounded-xl border border-warn/40 bg-warn/5 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">Improve next</p>
        <ul className="mt-2 space-y-1 text-sm text-ink">{focus.map((s) => <li key={s.key}>{s.label} <span className="font-mono text-sub">· {s.score}</span></li>)}</ul>
      </div>
    </div>
  );
}

/* ---------- weekly activity (real, from the student's own checklist) ---------- */

export function WeekBars() {
  const { data, today } = useDashboard();
  const days = lastNDays(7, today);
  const counts = days.map((d) => data.plan.activity[d] ?? 0);
  const max = Math.max(3, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <figure>
      <div className="flex h-28 items-end gap-2" role="img" aria-label={`Practice tasks completed over the last 7 days: ${counts.join(", ")}. Total ${total}.`}>
        {days.map((d, i) => (
          <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className="flex w-full flex-1 items-end rounded-lg bg-line/60">
              <div className={`w-full rounded-lg ${d === today ? "bg-cobalt" : "bg-[#8FB0F6]"}`} style={{ height: `${(counts[i] / max) * 100}%`, minHeight: counts[i] ? 6 : 0 }} />
            </div>
            <span className="text-[11px] text-sub">{new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-sm text-sub">{total === 0 ? "No tasks completed in the last 7 days yet." : `${total} task${total === 1 ? "" : "s"} completed in the last 7 days.`}</figcaption>
    </figure>
  );
}

/* ---------- checklist ---------- */

export function TaskCheck({ id }: { id: string }) {
  const { data, update, today } = useDashboard();
  const task = data.plan.tasks.find((t) => t.id === id);
  if (!task) return null;
  const done = taskDone(task, today);
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-paper">
        <input type="checkbox" checked={done} onChange={() => update((d) => toggleTask(d, id, today))} className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-[#285FE8]" />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm ${done ? "text-sub line-through" : "text-ink"}`}>{task.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-sub">
            <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" /> {task.minutes} min</span>
            <span>{task.skill}</span>
          </span>
        </span>
      </label>
    </li>
  );
}

/* ---------- sessions ---------- */

export function sessionDate(s: DemoSession): string {
  const d = new Date(Date.now() - s.daysAgo * 86_400_000);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ScorePill({ score }: { score: number }) {
  return <span className="rounded-full border border-cobalt/30 bg-surface px-3 py-1 font-mono text-sm text-cobalt-deep">{score}</span>;
}

export function RecentSessions({
  limit = 3,
  onOpenReport,
}: {
  limit?: number;
  onOpenReport?: (id: string) => void;
}) {
  const [sessions, setSessions] = useState<Array<Omit<PersistedInterviewSession, "questions">>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInterviewHistory()
      .then((data) => setSessions(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-4 text-xs text-sub">Loading recent sessions…</p>;
  }

  const list = Array.isArray(sessions) ? sessions : [];

  if (list.length === 0) {
    return <NoSessions />;
  }

  return (
    <ul className="divide-y divide-line">
      {list.slice(0, limit).map((s) => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-ink">{s.target_role}</p>
              <Badge tone={s.status === "completed" ? "ok" : "warn"}>
                {s.status === "completed" ? "Completed" : "In Progress"}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-sub">
              {new Date(s.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              · {s.answered_count}/{s.question_count} answered
            </p>
          </div>
          <div className="flex items-center gap-3">
            {s.average_score !== null && <ScorePill score={s.average_score} />}
            {onOpenReport ? (
              <button
                type="button"
                onClick={() => onOpenReport(s.id)}
                className="text-xs font-semibold text-cobalt hover:underline"
              >
                View Report →
              </button>
            ) : (
              <Link
                href="/dashboard/history"
                className="text-xs font-semibold text-cobalt hover:underline"
              >
                View Report →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NoSessions({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon="mic"
      title="No interviews yet"
      text="Your first mock interview will appear here with its score, duration and feedback. Nothing is recorded until you complete one."
      action={action ?? <ButtonLink href="/interview">Start your first interview</ButtonLink>}
    />
  );
}

/* ---------- misc ---------- */

export function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-sub">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((c) => <li key={c}><Badge tone="info">{c}</Badge></li>)}
    </ul>
  );
}

export function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <Button variant="outline" className="px-5 py-2.5" onClick={onClick}>{children}</Button>;
}
