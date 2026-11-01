"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/dashboard/Icon";
import { Card, CardHeader, EmptyState, Notice, PageHeader, ProgressBar, SelectField } from "@/components/dashboard/ui";
import { TextField } from "@/components/forms/Field";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { WeekBars } from "@/features/dashboard/parts";
import { SKILL_AREAS, addTask, minutesDoneToday, taskDone, toggleTask, weekTotal, type PlanTask } from "@/lib/dashboard-data";
import { validateIntRange, validateRequiredText } from "@/lib/validation";

const skillOptions = SKILL_AREAS.map((s) => ({ value: s, label: s }));

export function PlanPage() {
  const { data, update, today } = useDashboard();
  const { tasks, dailyMinutes, weeklyTasks } = data.plan;
  const doneToday = tasks.filter((t) => taskDone(t, today)).length;
  const minutes = minutesDoneToday(data, today);
  const week = weekTotal(data, today);

  const [title, setTitle] = useState("");
  const [mins, setMins] = useState("15");
  const [skill, setSkill] = useState(SKILL_AREAS[0]);
  const [errors, setErrors] = useState<{ title?: string; mins?: string }>({});

  const [dailyDraft, setDailyDraft] = useState(String(dailyMinutes));
  const [weeklyDraft, setWeeklyDraft] = useState(String(weeklyTasks));
  const [targetErrors, setTargetErrors] = useState<{ daily?: string; weekly?: string }>({});
  const [saved, setSaved] = useState("");

  function onAdd(e: FormEvent) {
    e.preventDefault();
    const next = { title: validateRequiredText(title, "a task", 3, 80), mins: validateIntRange(mins, "minutes", 5, 180) };
    setErrors(next);
    if (next.title || next.mins) return;
    update((d) => addTask(d, { title, minutes: Number(mins), skill }));
    setTitle("");
    setSaved("Task added.");
  }

  function onTargets(e: FormEvent) {
    e.preventDefault();
    const next = { daily: validateIntRange(dailyDraft, "daily minutes", 10, 480), weekly: validateIntRange(weeklyDraft, "weekly tasks", 1, 100) };
    setTargetErrors(next);
    if (next.daily || next.weekly) return;
    update((d) => ({ ...d, plan: { ...d.plan, dailyMinutes: Number(dailyDraft), weeklyTasks: Number(weeklyDraft) } }));
    setSaved("Targets updated.");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Practice Plan" description="A starter plan you can edit. Tick tasks off as you go. Your progress is saved in this browser." />
      {saved && <Notice>{saved}</Notice>}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4" labelledBy="pp-prog">
          <CardHeader id="pp-prog" title="Progress" />
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm"><span className="text-sub">Today · tasks</span><span className="font-mono text-ink">{doneToday}/{tasks.length}</span></div>
              <ProgressBar value={tasks.length ? (doneToday / tasks.length) * 100 : 0} label="Tasks completed today" tone={tasks.length && doneToday === tasks.length ? "ok" : "blue"} />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm"><span className="text-sub">Today · minutes</span><span className="font-mono text-ink">{minutes}/{dailyMinutes}</span></div>
              <ProgressBar value={(minutes / dailyMinutes) * 100} label="Minutes practised today toward daily target" tone={minutes >= dailyMinutes ? "ok" : "blue"} />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm"><span className="text-sub">This week · tasks</span><span className="font-mono text-ink">{week}/{weeklyTasks}</span></div>
              <ProgressBar value={(week / weeklyTasks) * 100} label="Tasks completed this week toward weekly target" tone={week >= weeklyTasks ? "ok" : "blue"} />
            </div>
            <WeekBars />
          </div>

          <form onSubmit={onTargets} noValidate className="mt-6 space-y-4 border-t border-line pt-5">
            <h3 className="text-sm font-medium text-ink">Edit targets</h3>
            <TextField label="Daily minutes" inputMode="numeric" value={dailyDraft} onChange={(e) => setDailyDraft(e.target.value)} error={targetErrors.daily} />
            <TextField label="Weekly tasks" inputMode="numeric" value={weeklyDraft} onChange={(e) => setWeeklyDraft(e.target.value)} error={targetErrors.weekly} />
            <Button type="submit" variant="outline" className="px-5 py-2.5">Save targets</Button>
          </form>
        </Card>

        <Card className="lg:col-span-8" labelledBy="pp-tasks">
          <CardHeader id="pp-tasks" title="Practice checklist" subtitle="Checkmarks reset each day." />
          {tasks.length === 0 ? (
            <EmptyState icon="calendar" title="No tasks yet" text="Add your first practice task below." />
          ) : (
            <ul className="divide-y divide-line">{tasks.map((t) => <EditableTask key={t.id} task={t} />)}</ul>
          )}

          <form onSubmit={onAdd} noValidate className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-6">
            <div className="sm:col-span-6"><TextField label="New task" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="e.g. Mock answer: tell me about yourself" maxLength={80} /></div>
            <div className="sm:col-span-2"><TextField label="Minutes" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} error={errors.mins} hint="5 to 180" /></div>
            <div className="sm:col-span-3"><SelectField label="Skill" value={skill} options={skillOptions} onChange={(e) => setSkill(e.target.value)} /></div>
            <div className="flex items-end sm:col-span-1"><Button type="submit" className="w-full px-4 py-3"><Icon name="plus" className="h-4 w-4" /> Add</Button></div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function EditableTask({ task }: { task: PlanTask }) {
  const { update, today } = useDashboard();
  const done = taskDone(task, today);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [mins, setMins] = useState(String(task.minutes));
  const [errors, setErrors] = useState<{ title?: string; mins?: string }>({});

  function save(e: FormEvent) {
    e.preventDefault();
    const next = { title: validateRequiredText(title, "a task", 3, 80), mins: validateIntRange(mins, "minutes", 5, 180) };
    setErrors(next);
    if (next.title || next.mins) return;
    update((d) => ({ ...d, plan: { ...d.plan, tasks: d.plan.tasks.map((t) => (t.id === task.id ? { ...t, title: title.trim(), minutes: Number(mins) } : t)) } }));
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-4">
        <form onSubmit={save} noValidate className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-4"><TextField label="Task" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={80} data-autofocus /></div>
          <div className="sm:col-span-2"><TextField label="Minutes" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} error={errors.mins} /></div>
          <div className="flex gap-3 sm:col-span-6">
            <Button type="submit" className="px-5 py-2.5">Save</Button>
            <Button type="button" variant="outline" className="px-5 py-2.5" onClick={() => { setEditing(false); setTitle(task.title); setMins(String(task.minutes)); setErrors({}); }}>Cancel</Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-3.5">
      <input id={`task-${task.id}`} type="checkbox" checked={done} onChange={() => update((d) => toggleTask(d, task.id, today))} className="mt-1 h-5 w-5 shrink-0 rounded border-line accent-[#285FE8]" />
      <label htmlFor={`task-${task.id}`} className="min-w-0 flex-1 cursor-pointer">
        <span className={`block text-sm ${done ? "text-sub line-through" : "text-ink"}`}>{task.title}</span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-sub"><span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" />{task.minutes} min</span><span>{task.skill}</span></span>
      </label>
      <button type="button" onClick={() => setEditing(true)} aria-label={`Edit task: ${task.title}`} className="flex h-9 w-9 items-center justify-center rounded-full text-sub transition hover:bg-paper hover:text-cobalt"><Icon name="edit" className="h-4 w-4" /></button>
      <button type="button" onClick={() => update((d) => ({ ...d, plan: { ...d.plan, tasks: d.plan.tasks.filter((t) => t.id !== task.id) } }))} aria-label={`Delete task: ${task.title}`} className="flex h-9 w-9 items-center justify-center rounded-full text-sub transition hover:bg-paper hover:text-bad"><Icon name="trash" className="h-4 w-4" /></button>
    </li>
  );
}
