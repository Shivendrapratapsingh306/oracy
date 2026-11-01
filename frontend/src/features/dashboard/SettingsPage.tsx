"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader, Notice, PageHeader, SelectField, Toggle } from "@/components/dashboard/ui";
import { TextField } from "@/components/forms/Field";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { INTERVIEW_TYPES, SESSION_LENGTHS, resetDashboard, type InterviewType } from "@/lib/dashboard-data";
import { signOut } from "@/services/auth";
import { useTranslation, type SupportedLanguage } from "@/features/i18n/LanguageContext";
import { useTheme, type Theme } from "@/features/theme/ThemeContext";

export function SettingsPage() {
  const { data, update, session } = useDashboard();
  const { language, setLanguage, languages, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const s = data.settings;
  const [inApp, setInApp] = useState(s.inApp);
  const [practiceReminders, setPracticeReminders] = useState(s.practiceReminders);
  const [weeklySummary, setWeeklySummary] = useState(s.weeklySummary);
  const [reminderTime, setReminderTime] = useState(s.reminderTime);
  const [interviewType, setInterviewType] = useState<InterviewType>(s.interviewType);
  const [sessionMinutes, setSessionMinutes] = useState(s.sessionMinutes);
  const [sampleMode, setSampleMode] = useState(data.sampleMode);
  const [timeError, setTimeError] = useState<string>();
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = practiceReminders && !/^\d{2}:\d{2}$/.test(reminderTime) ? t("auth.validation.required") : undefined;
    setTimeError(err);
    if (err) {
      setStatus({ tone: "bad", text: t("common.error") });
      return;
    }
    const ok = update((d) => ({
      ...d,
      sampleMode,
      settings: {
        ...d.settings,
        inApp,
        practiceReminders,
        weeklySummary,
        reminderTime: reminderTime || d.settings.reminderTime,
        interviewType,
        sessionMinutes,
      },
    }));
    setStatus(ok ? { tone: "ok", text: t("dashboard.settings.savedSuccess") } : { tone: "bad", text: t("common.error") });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.settings.title")}
        description={t("dashboard.settings.subtitle")}
      />

      {/* Language & Appearance Settings */}
      <Card labelledBy="st-lang-theme">
        <CardHeader id="st-lang-theme" title={`${t("dashboard.settings.languageSetting")} & ${t("dashboard.settings.themeSetting")}`} />
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink">
              {t("dashboard.settings.languageSetting")}
            </label>
            <p className="mt-1 text-xs text-sub">{t("dashboard.settings.languageHelp")}</p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="mt-3 block w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink shadow-sm focus:border-cobalt focus:outline-none focus:ring-1 focus:ring-cobalt"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeLabel} ({l.label})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink">
              {t("dashboard.settings.themeSetting")}
            </label>
            <p className="mt-1 text-xs text-sub">{t("dashboard.settings.themeHelp")}</p>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="mt-3 block w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink shadow-sm focus:border-cobalt focus:outline-none focus:ring-1 focus:ring-cobalt"
            >
              <option value="light">{t("dashboard.settings.lightTheme")}</option>
              <option value="dark">{t("dashboard.settings.darkTheme")}</option>
              <option value="system">{t("dashboard.settings.systemTheme")}</option>
            </select>
          </div>
        </div>
      </Card>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card labelledBy="st-notif">
          <CardHeader id="st-notif" title="Notifications" />
          <div className="divide-y divide-line">
            <Toggle checked={inApp} onChange={setInApp} label="In-app notifications" description="Show the unread dot and updates in the bell menu." />
            <Toggle checked={practiceReminders} onChange={setPracticeReminders} label="Practice reminders" description="Saved as a preference." />
            <Toggle checked={weeklySummary} onChange={setWeeklySummary} label="Weekly progress summary" description="Receive progress breakdown summaries." />
          </div>
          {practiceReminders && (
            <div className="mt-4 max-w-xs">
              <TextField label="Reminder time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} error={timeError} />
            </div>
          )}
        </Card>

        <Card labelledBy="st-prefs">
          <CardHeader id="st-prefs" title="Practice preferences" />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label={t("interview.setup.typeLabel")}
              value={interviewType}
              options={INTERVIEW_TYPES.map((type) => ({ value: type, label: type }))}
              onChange={(e) => setInterviewType(e.target.value as InterviewType)}
            />
            <SelectField
              label={t("interview.setup.questionCount")}
              value={sessionMinutes}
              options={SESSION_LENGTHS.map((m) => ({ value: m, label: `${m} questions` }))}
              onChange={(e) => setSessionMinutes(e.target.value)}
            />
          </div>
          <div className="mt-4 border-t border-line pt-2">
            <Toggle checked={sampleMode} onChange={setSampleMode} label="Show sample score insights" description="Displays score breakdowns and demonstration sessions." />
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit">{t("dashboard.settings.saveSettings")}</Button>
          {status && <div className="min-w-0 flex-1"><Notice tone={status.tone}>{status.text}</Notice></div>}
        </div>
      </form>

      <Card labelledBy="st-account">
        <CardHeader id="st-account" title="Account and data" />
        <p className="text-sm text-sub">Signed in as <span className="text-ink">{session.email}</span>.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={async () => { await signOut(); router.push("/"); }}>
            {t("dashboard.sidebar.signOut")}
          </Button>
          {!confirmReset ? (
            <Button variant="outline" className="hover:!border-bad hover:!text-bad" onClick={() => setConfirmReset(true)}>
              {t("common.delete")} Dashboard Data
            </Button>
          ) : (
            <div role="alertdialog" aria-label="Confirm reset" className="flex flex-wrap items-center gap-3 rounded-xl border border-bad/30 bg-bad/5 px-4 py-3">
              <p className="text-sm text-ink">Clear your saved profile, goals, plan and settings from this browser?</p>
              <Button className="!bg-bad px-5 py-2.5 !shadow-none hover:!bg-red-700" onClick={() => { resetDashboard(session.email); setConfirmReset(false); }}>
                {t("common.delete")}
              </Button>
              <Button variant="outline" className="px-5 py-2.5" onClick={() => setConfirmReset(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
