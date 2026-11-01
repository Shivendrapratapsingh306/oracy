"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/dashboard/Icon";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, ProgressBar, SelectField } from "@/components/dashboard/ui";
import { TextField } from "@/components/forms/Field";
import { CareerEditModal } from "@/features/dashboard/CareerEditModal";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { Chips } from "@/features/dashboard/parts";
import { daysUntil, formatDate, suggestedSkillsFor, uid, type SkillStatus } from "@/lib/dashboard-data";
import { validateRequiredText } from "@/lib/validation";

const statusOptions = [
  { value: "gap", label: "Skill gap" },
  { value: "learning", label: "Learning" },
  { value: "ready", label: "Ready" },
];

export function CareerPage() {
  const { data, update, today } = useDashboard();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillError, setSkillError] = useState<string>();
  const [milestone, setMilestone] = useState("");
  const [milestoneError, setMilestoneError] = useState<string>();

  const { career } = data;
  const days = career.deadline ? daysUntil(career.deadline, today) : null;
  const ready = career.skills.filter((s) => s.status === "ready").length;
  const gaps = career.skills.filter((s) => s.status === "gap");
  const msDone = career.milestones.filter((m) => m.done).length;

  function addSkill(e: FormEvent) {
    e.preventDefault();
    const err = validateRequiredText(skillName, "a skill", 2, 60) ?? (career.skills.some((s) => s.name.toLowerCase() === skillName.trim().toLowerCase()) ? "That skill is already on your list." : undefined);
    setSkillError(err);
    if (err) return;
    update((d) => ({ ...d, career: { ...d.career, skills: [...d.career.skills, { id: uid(), name: skillName.trim(), status: "gap" }] } }));
    setSkillName("");
  }

  function addMilestone(e: FormEvent) {
    e.preventDefault();
    const err = validateRequiredText(milestone, "a milestone", 3, 80);
    setMilestoneError(err);
    if (err) return;
    update((d) => ({ ...d, career: { ...d.career, milestones: [...d.career.milestones, { id: uid(), label: milestone.trim(), done: false }] } }));
    setMilestone("");
  }

  function addSuggested() {
    update((d) => {
      const have = new Set(d.career.skills.map((s) => s.name.toLowerCase()));
      const add = suggestedSkillsFor(d.career.role).filter((n) => !have.has(n.toLowerCase())).map((name) => ({ id: uid(), name, status: "gap" as SkillStatus }));
      return { ...d, career: { ...d.career, skills: [...d.career.skills, ...add] } };
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Career Launchpad" description="Define your target, track the skills you need and break preparation into milestones." actions={<Button onClick={() => setEditing(true)}><Icon name="edit" className="h-4 w-4" /> Edit career goals</Button>} />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5" labelledBy="cl-target">
          <CardHeader id="cl-target" title="Your target" />
          {!career.role.trim() ? (
            <EmptyState icon="briefcase" title="No target set yet" text="Pick a role, a few companies and a deadline." action={<Button onClick={() => setEditing(true)}>Set career goals</Button>} />
          ) : (
            <dl className="space-y-5 text-sm">
              <div><dt className="text-xs uppercase tracking-[0.14em] text-sub">Target job role</dt><dd className="mt-1 text-lg font-medium text-ink">{career.role}</dd></div>
              <div><dt className="mb-2 text-xs uppercase tracking-[0.14em] text-sub">Target companies</dt><dd><Chips items={career.companies} empty="No companies added yet." /></dd></div>
              <div><dt className="text-xs uppercase tracking-[0.14em] text-sub">Career goals</dt><dd className="mt-1 whitespace-pre-wrap text-ink">{career.goals || <span className="text-sub">No goals written yet.</span>}</dd></div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-sub">Preparation deadline</dt>
                <dd className="mt-1 text-ink">
                  {career.deadline ? <>{formatDate(career.deadline)} {days !== null && <Badge tone={days < 0 ? "bad" : days <= 14 ? "warn" : "info"}>{days < 0 ? "Passed" : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} left`}</Badge>}</> : <span className="text-sub">Not set</span>}
                </dd>
              </div>
            </dl>
          )}
        </Card>

        <Card className="lg:col-span-7" labelledBy="cl-skills">
          <CardHeader id="cl-skills" title="Required skills and gaps" subtitle="Mark your own level. This is a self-assessment, not an AI result." />
          {career.skills.length > 0 && (
            <div className="mb-5">
              <div className="mb-2 flex justify-between text-sm text-sub"><span>{ready} of {career.skills.length} ready</span><span>{gaps.length} gap{gaps.length === 1 ? "" : "s"}</span></div>
              <ProgressBar value={(ready / career.skills.length) * 100} label="Skills marked ready" tone="ok" />
            </div>
          )}
          {career.skills.length === 0 ? (
            <EmptyState
              icon="target"
              title="No skills listed"
              text={career.role.trim() ? `Start from suggested skills for ${career.role}, or add your own below.` : "Set a target role for suggestions, or add your own below."}
              action={career.role.trim() ? <Button variant="outline" onClick={addSuggested}>Add suggested skills</Button> : <Button onClick={() => setEditing(true)}>Set target role</Button>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {career.skills.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className={`min-w-0 flex-1 text-sm ${s.status === "ready" ? "text-sub" : "text-ink"}`}>{s.name}</span>
                  <div className="w-36">
                    <SelectField hideLabel label={`Level for ${s.name}`} value={s.status} options={statusOptions} onChange={(e) => update((d) => ({ ...d, career: { ...d.career, skills: d.career.skills.map((x) => (x.id === s.id ? { ...x, status: e.target.value as SkillStatus } : x)) } }))} />
                  </div>
                  <button type="button" aria-label={`Remove ${s.name}`} onClick={() => update((d) => ({ ...d, career: { ...d.career, skills: d.career.skills.filter((x) => x.id !== s.id) } }))} className="flex h-9 w-9 items-center justify-center rounded-full text-sub transition hover:bg-paper hover:text-bad"><Icon name="trash" className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addSkill} noValidate className="mt-5 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1"><TextField label="Add a skill" value={skillName} onChange={(e) => setSkillName(e.target.value)} error={skillError} placeholder="e.g. System design" maxLength={60} /></div>
            <Button type="submit" variant="outline" className="mt-[1.65rem] px-5 py-3"><Icon name="plus" className="h-4 w-4" /> Add</Button>
          </form>
          {career.skills.length > 0 && career.role.trim() && <button type="button" onClick={addSuggested} className="mt-3 text-sm font-medium text-cobalt hover:underline">Add suggested skills for {career.role}</button>}
        </Card>

        <Card className="lg:col-span-12" labelledBy="cl-ms">
          <CardHeader id="cl-ms" title="Preparation milestones" subtitle={`${msDone} of ${career.milestones.length} complete`} />
          {career.milestones.length > 0 && <div className="mb-4"><ProgressBar value={(msDone / career.milestones.length) * 100} label="Milestones complete" /></div>}
          {career.milestones.length === 0 ? (
            <p className="text-sm text-sub">No milestones yet. Add your first one below.</p>
          ) : (
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {career.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-paper">
                  <input id={`ms-${m.id}`} type="checkbox" checked={m.done} onChange={() => update((d) => ({ ...d, career: { ...d.career, milestones: d.career.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) } }))} className="h-5 w-5 shrink-0 rounded border-line accent-[#285FE8]" />
                  <label htmlFor={`ms-${m.id}`} className={`min-w-0 flex-1 cursor-pointer text-sm ${m.done ? "text-sub line-through" : "text-ink"}`}>{m.label}</label>
                  <button type="button" aria-label={`Remove milestone ${m.label}`} onClick={() => update((d) => ({ ...d, career: { ...d.career, milestones: d.career.milestones.filter((x) => x.id !== m.id) } }))} className="flex h-8 w-8 items-center justify-center rounded-full text-sub transition hover:text-bad"><Icon name="trash" className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addMilestone} noValidate className="mt-5 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1"><TextField label="Add a milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)} error={milestoneError} placeholder="e.g. Finish 10 system design questions" maxLength={80} /></div>
            <Button type="submit" variant="outline" className="mt-[1.65rem] px-5 py-3"><Icon name="plus" className="h-4 w-4" /> Add</Button>
          </form>
        </Card>
      </div>

      {editing && <CareerEditModal onClose={() => setEditing(false)} onSaved={(ok) => setNotice(ok ? { tone: "ok", text: "Career goals saved." } : { tone: "bad", text: "Saved for this visit, but your browser blocked storage so it won’t persist." })} />}
    </div>
  );
}
