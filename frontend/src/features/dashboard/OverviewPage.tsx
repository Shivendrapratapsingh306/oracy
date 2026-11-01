"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { ArrowRight } from "@/components/Icons";
import { Icon } from "@/components/dashboard/Icon";
import { Avatar, Badge, Card, CardHeader, EmptyState, Notice, ProgressBar } from "@/components/dashboard/ui";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { CareerEditModal } from "@/features/dashboard/CareerEditModal";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { Chips, RecentSessions, SampleSkillBars, StrengthsAndFocus, TaskCheck, WeekBars } from "@/features/dashboard/parts";
import { InterviewReportModal } from "@/features/dashboard/InterviewReportModal";
import { addTask, daysUntil, formatDate, minutesDoneToday, profileCompletion, readinessLabel, recommendNext, taskDone, weakestSkill, weekTotal } from "@/lib/dashboard-data";
import { demoOverallScore, demoProgress } from "@/lib/demo-data";
import { getProgressAnalytics, type ProgressAnalytics } from "@/services/api";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function OverviewPage() {
  const { data, update, firstName, today } = useDashboard();
  const { t, formatDate } = useTranslation();
  const [careerOpen, setCareerOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [analytics, setAnalytics] = useState<ProgressAnalytics | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    getProgressAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  const sample = data.sampleMode;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const weak = weakestSkill(data);
  const next = recommendNext(data);
  const completion = profileCompletion(data);
  const profileName = data.profile.name.trim() || firstName;
  const tasks = data.plan.tasks;
  const doneToday = tasks.filter((t) => taskDone(t, today)).length;
  const minutesToday = minutesDoneToday(data, today);
  const weekDone = weekTotal(data, today);
  const alreadyPlanned = tasks.some((t) => t.title === next.title);
  const readySkills = data.career.skills.filter((s) => s.status === "ready").length;
  const gaps = data.career.skills.filter((s) => s.status !== "ready");
  const days = data.career.deadline ? daysUntil(data.career.deadline, today) : null;
  const gain = demoProgress[demoProgress.length - 1] - demoProgress[0];

  const overallScore = analytics?.overall_average_score;

  return (
    <div className="space-y-6">
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      {/* Welcome */}
      <section aria-labelledby="welcome" className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-card via-card to-surface p-6 shadow-card sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_260px] lg:items-center">
          <div>
            <p className="text-sm font-medium text-cobalt">{greeting}</p>
            <h1 id="welcome" className="mt-1 font-display text-3xl leading-tight text-ink sm:text-5xl">Welcome back, {firstName}.</h1>
            <p className="mt-3 max-w-2xl text-sub">
              {data.career.role.trim() ? <>You’re preparing for <strong className="font-medium text-ink">{data.career.role}</strong> roles. </> : <>Set a target role to personalise your preparation. </>}
              Small, steady practice beats cramming, so one focused session today is a great start.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/interview">Start Mock Interview <ArrowRight /></ButtonLink>
              <ButtonLink href="/interview" variant="outline">{weak ? `Practise ${weak.name}` : "Practise Weakest Skill"}</ButtonLink>
              <ButtonLink href="/dashboard/performance" variant="outline">View Performance</ButtonLink>
              <Button variant="outline" onClick={() => setCareerOpen(true)}>{t("dashboard.overview.editCareer")}</Button>
            </div>
            {weak ? (
              <p className="mt-4 text-xs text-sub">Weakest skill: {weak.name}{weak.score !== undefined ? ` (${weak.score})` : ""}{weak.basis === "your data" ? " · from your Career Launchpad" : ""}</p>
            ) : (
              <p className="mt-4 text-xs text-sub">Your weakest skill appears here once you add skill gaps or complete an interview.</p>
            )}
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[240px] rounded-[28px] border border-line bg-card p-4 shadow-card">
              <div className="relative flex justify-center">
                <Avatar name={profileName} photo={data.profile.photo} size={132} />
                <Link
                  href="/dashboard/profile#pr-photo"
                  aria-label="Edit profile photo"
                  title="Edit profile photo"
                  className="absolute bottom-0 right-[calc(50%-4.125rem)] flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink shadow-card transition hover:border-cobalt hover:text-cobalt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
                >
                  <Icon name="edit" className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 text-center">
                <p className="font-medium text-ink">{profileName}</p>
                {data.career.role.trim() ? (
                  <p className="mt-1 text-sm text-sub">{data.career.role}</p>
                ) : (
                  <Link href="/dashboard/career" className="mt-1 inline-flex text-sm font-medium text-cobalt underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
                    Set your target role
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Readiness */}
        <Card className="lg:col-span-5" labelledBy="readiness-h">
          <CardHeader id="readiness-h" title="Interview readiness" />
          {overallScore !== null && overallScore !== undefined ? (
            <div className="flex flex-col items-center">
              <ScoreRing value={overallScore} label="Readiness" size={176} valueClass="text-5xl" />
              <p className="mt-4 text-lg font-medium text-ink">{readinessLabel(overallScore)}</p>
              <div className="mt-4 w-full">
                <div className="mb-2 flex justify-between text-xs text-sub">
                  <span>Target benchmark (85)</span>
                  <span className="font-mono">{Math.max(0, 85 - overallScore)} points to go</span>
                </div>
                <ProgressBar value={(overallScore / 85) * 100} label="Progress toward readiness target of 85" />
                <p className="mt-2 text-xs text-sub">Derived from {analytics?.completed_sessions} completed practice session(s).</p>
              </div>
              {analytics?.areas_requiring_practice && analytics.areas_requiring_practice.length > 0 && (
                <div className="mt-5 w-full rounded-xl bg-surface p-4 text-sm text-ink">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-cobalt-deep">Recommended focus</p>
                  <p className="mt-1 text-xs">Work on {analytics.areas_requiring_practice[0]}</p>
                </div>
              )}
            </div>
          ) : sample ? (
            <div className="flex flex-col items-center">
              <ScoreRing value={demoOverallScore} label="Readiness" size={176} valueClass="text-5xl" />
              <p className="mt-4 text-lg font-medium text-ink">{readinessLabel(demoOverallScore)}</p>
              <div className="mt-4 w-full">
                <div className="mb-2 flex justify-between text-xs text-sub"><span>Progress to a target of 85</span><span className="font-mono">{Math.max(0, 85 - demoOverallScore)} to go</span></div>
                <ProgressBar value={(demoOverallScore / 85) * 100} label="Progress toward readiness target of 85" />
                <p className="mt-2 text-xs text-sub">Up {gain} points across {demoProgress.length} sessions.</p>
              </div>
            </div>
          ) : (
            <EmptyState icon="target" title="No readiness score yet" text="Your readiness score is derived from completed practice interviews. Until you complete your first interview, there is nothing to score." action={<ButtonLink href="/interview">Start your first interview</ButtonLink>} />
          )}
        </Card>

        {/* Next best action */}
        <section aria-labelledby="next-h" className="min-w-0 rounded-2xl border border-cobalt/20 bg-gradient-to-br from-surface to-white p-5 shadow-card sm:p-6 lg:col-span-7">
          <CardHeader id="next-h" title="Your next step" />
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt text-white shadow-lift"><Icon name="sparkle" /></span>
            <div className="min-w-0">
              <h3 className="text-xl font-medium text-ink">{next.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="neutral"><Icon name="clock" className="mr-1 h-3.5 w-3.5" />About {next.minutes} min</Badge>
                <Badge tone="info">{next.skill}</Badge>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-sub"><strong className="font-medium text-ink">Why it matters:</strong> {next.why}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={next.href}>{next.cta} <ArrowRight /></ButtonLink>
            {next.plannable && (
              <Button
                variant="outline"
                disabled={alreadyPlanned}
                onClick={() => {
                  update((d) => addTask(d, { title: next.title, minutes: next.minutes, skill: next.skill }));
                  setNotice({ tone: "ok", text: "Added to today’s practice plan." });
                }}
              >
                {alreadyPlanned ? "In today’s plan" : "Add to today’s plan"}
              </Button>
            )}
          </div>
        </section>

        {/* Skill performance */}
        <Card className="lg:col-span-7" labelledBy="skills-h">
          <CardHeader id="skills-h" title="Skill performance" action={<Link href="/dashboard/performance" className="text-sm font-medium text-cobalt hover:underline">Open Performance Lab</Link>} />
          {analytics?.dimension_averages && Object.keys(analytics.dimension_averages).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(analytics.dimension_averages).slice(0, 4).map(([dimension, score]) => (
                <div key={dimension} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-ink">{dimension}</span>
                    <span className="font-mono text-cobalt font-semibold">{score}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cobalt transition-all duration-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : sample ? (
            <div className="space-y-6">
              <SampleSkillBars />
              <StrengthsAndFocus />
            </div>
          ) : (
            <EmptyState icon="chart" title="Skill scores appear after your first interview" text="Communication, answer structure, technical knowledge and problem-solving are scored from real sessions. None have been recorded yet." action={<ButtonLink href="/interview">Start your first interview</ButtonLink>} />
          )}
        </Card>

        {/* Profile completion */}
        <Card className="lg:col-span-5" labelledBy="profile-h">
          <CardHeader id="profile-h" title="Profile completion" />
          <div className="flex items-end justify-between">
            <p className="font-display text-5xl text-ink">{completion.percent}<span className="text-2xl text-sub">%</span></p>
            <p className="pb-1 text-sm text-sub">{completion.filled} of {completion.total} fields</p>
          </div>
          <div className="mt-3"><ProgressBar value={completion.percent} label={`Profile ${completion.percent}% complete`} tone={completion.percent === 100 ? "ok" : "blue"} /></div>
          {completion.missing.length ? (
            <>
              <p className="mt-5 text-sm font-medium text-ink">Still to add</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {completion.missing.map((m) => <li key={m.key}><Link href="/dashboard/profile" className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-ink/80 transition hover:border-cobalt hover:text-cobalt"><Icon name="plus" className="h-3 w-3" />{m.label}</Link></li>)}
              </ul>
              <div className="mt-5"><ButtonLink href="/dashboard/profile" variant="outline" className="px-5 py-2.5">Complete profile</ButtonLink></div>
            </>
          ) : (
            <p className="mt-5 text-sm text-emerald-700">Your profile is complete.</p>
          )}
        </Card>

        {/* Daily plan */}
        <Card className="lg:col-span-6" labelledBy="plan-h">
          <CardHeader id="plan-h" title="Today’s practice plan" action={<Link href="/dashboard/plan" className="text-sm font-medium text-cobalt hover:underline">Edit plan</Link>} />
          {tasks.length === 0 ? (
            <EmptyState icon="calendar" title="Your plan is empty" text="Add a few short tasks to build a daily routine." action={<ButtonLink href="/dashboard/plan">Add tasks</ButtonLink>} />
          ) : (
            <>
              <div className="mb-1 flex justify-between text-sm"><span className="text-sub">{doneToday} of {tasks.length} tasks · {minutesToday}/{data.plan.dailyMinutes} min</span><span className="font-mono text-ink">{Math.round((doneToday / tasks.length) * 100)}%</span></div>
              <ProgressBar value={(doneToday / tasks.length) * 100} label="Today's task completion" tone={doneToday === tasks.length ? "ok" : "blue"} />
              <ul className="mt-3">{tasks.slice(0, 5).map((t) => <TaskCheck key={t.id} id={t.id} />)}</ul>
              {tasks.length > 5 && <p className="mt-2 text-sm text-sub">+{tasks.length - 5} more in your plan.</p>}
            </>
          )}
        </Card>

        {/* Weekly progress */}
        <Card className="lg:col-span-6" labelledBy="week-h">
          <CardHeader id="week-h" title="Weekly progress" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs text-sub">Tasks this week</p>
              <p className="mt-1 font-display text-3xl text-ink">{weekDone}<span className="text-lg text-sub"> / {data.plan.weeklyTasks}</span></p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs text-sub">Mock interviews recorded</p>
              <p className="mt-1 font-display text-3xl text-ink">
                {analytics?.completed_sessions ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-4"><ProgressBar value={(weekDone / data.plan.weeklyTasks) * 100} label="Weekly goal completion" tone={weekDone >= data.plan.weeklyTasks ? "ok" : "blue"} /></div>
          <div className="mt-5"><WeekBars /></div>
        </Card>

        {/* Career */}
        <Card className="lg:col-span-6" labelledBy="career-h">
          <CardHeader id="career-h" title="Career Launchpad" action={<Link href="/dashboard/career" className="text-sm font-medium text-cobalt hover:underline">Open</Link>} />
          {!data.career.role.trim() ? (
            <EmptyState icon="briefcase" title="Set your target" text="Choose a role, companies and a deadline to get a tailored skill-gap checklist." action={<Button onClick={() => setCareerOpen(true)}>Edit career goals</Button>} />
          ) : (
            <dl className="space-y-4 text-sm">
              <div><dt className="text-xs uppercase tracking-[0.14em] text-sub">Target role</dt><dd className="mt-1 font-medium text-ink">{data.career.role}</dd></div>
              <div><dt className="mb-1.5 text-xs uppercase tracking-[0.14em] text-sub">Target companies</dt><dd><Chips items={data.career.companies} empty="No companies added yet." /></dd></div>
              <div><dt className="text-xs uppercase tracking-[0.14em] text-sub">Deadline</dt><dd className="mt-1 text-ink">{data.career.deadline ? `${formatDate(data.career.deadline)}${days !== null && days >= 0 ? ` · ${days} day${days === 1 ? "" : "s"} left` : days !== null ? " · passed" : ""}` : "Not set"}</dd></div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-sub">Skill gaps</dt>
                <dd className="mt-1 text-ink">{data.career.skills.length ? `${readySkills} of ${data.career.skills.length} skills ready${gaps.length ? ` · next: ${gaps[0].name}` : ""}` : <Link href="/dashboard/career" className="text-cobalt hover:underline">Add required skills</Link>}</dd>
              </div>
            </dl>
          )}
        </Card>

        {/* Recent sessions */}
        <Card className="lg:col-span-6" labelledBy="recent-h">
          <CardHeader id="recent-h" title="Recent interview sessions" action={<Link href="/dashboard/history" className="text-sm font-medium text-cobalt hover:underline">See all</Link>} />
          <RecentSessions limit={3} onOpenReport={setSelectedSessionId} />
        </Card>
      </div>

      {careerOpen && (
        <CareerEditModal
          onClose={() => setCareerOpen(false)}
          onSaved={(ok) => setNotice(ok ? { tone: "ok", text: "Career goals saved." } : { tone: "bad", text: "Saved for this visit, but your browser blocked storage so it won’t persist." })}
        />
      )}

      {selectedSessionId && (
        <InterviewReportModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
