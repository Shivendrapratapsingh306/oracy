"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/dashboard/Icon";
import { Avatar, Card, CardHeader, Notice, PageHeader, ProgressBar, TextAreaField } from "@/components/dashboard/ui";
import { TextField } from "@/components/forms/Field";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { ROLES, profileCompletion } from "@/lib/dashboard-data";
import { MAX_RESUME_MB } from "@/lib/site";
import { validateGradYear, validateOptionalText, validatePhotoFile, validateRequiredText, validateResumeFile } from "@/lib/validation";
import { getMyProfile, updateMyProfile } from "@/services/auth";
import { useTranslation } from "@/features/i18n/LanguageContext";

const MAX_PHOTO_KB = 400;
const degrees = ["B.Tech / B.E.", "B.Sc", "BCA", "B.Com", "M.Tech / M.E.", "M.Sc", "MCA", "MBA"];

export function ProfilePage() {
  const { data, update, session } = useDashboard();
  const { t } = useTranslation();
  const [name, setName] = useState(data.profile.name);
  const [college, setCollege] = useState(data.profile.college);
  const [degree, setDegree] = useState(data.profile.degree);
  const [gradYear, setGradYear] = useState(data.profile.gradYear);
  const [role, setRole] = useState(data.career.role);
  const [goals, setGoals] = useState(data.career.goals);
  const [photo, setPhoto] = useState(data.profile.photo);
  const [resume, setResume] = useState({ name: data.profile.resumeName, size: data.profile.resumeSize });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);

  const completion = profileCompletion(data);

  useEffect(() => {
    let active = true;
    getMyProfile().then((account) => {
      if (!active) return;
      setName(account.full_name);
      const profile = account.profile_data ?? {};
      if (Object.values(profile).some((value) => Boolean(value))) {
        setCollege(profile.college ?? "");
        setDegree(profile.degree ?? "");
        setGradYear(profile.grad_year ?? "");
        setRole(profile.target_role ?? "");
        setGoals(profile.career_goals ?? "");
      }
      update((current) => ({
        ...current,
        profile: { ...current.profile, name: account.full_name },
        ...(Object.values(profile).some((value) => Boolean(value)) ? { career: { ...current.career, role: profile.target_role ?? "", goals: profile.career_goals ?? "" } } : {}),
      }));
    }).catch(() => {
      // The local draft remains available; saving below will show the API error if offline.
    });
    return () => { active = false; };
  }, [update]);

  function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validatePhotoFile(file, MAX_PHOTO_KB);
    setErrors((x) => ({ ...x, photo: err }));
    if (err) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && setPhoto(reader.result);
    reader.onerror = () => setErrors((x) => ({ ...x, photo: "Couldn’t read that image. Try another file." }));
    reader.readAsDataURL(file);
  }

  function onResume(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const err = validateResumeFile(file, MAX_RESUME_MB);
    setErrors((x) => ({ ...x, resume: err }));
    if (!err) setResume({ name: file.name, size: file.size });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      name: validateRequiredText(name, "your name", 2, 60),
      college: validateOptionalText(college, "college", 80),
      degree: validateOptionalText(degree, "degree", 60),
      gradYear: validateGradYear(gradYear),
      role: validateOptionalText(role, "role", 60),
      goals: validateOptionalText(goals, "career goals", 280),
      photo: errors.photo,
      resume: errors.resume,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      setStatus({ tone: "bad", text: "Please fix the highlighted fields." });
      return;
    }
    try {
      const account = await updateMyProfile({
        full_name: name.trim(), college: college.trim(), degree: degree.trim(), grad_year: gradYear.trim(),
        target_role: role.trim(), career_goals: goals.trim(),
      });
      const persisted = update((d) => ({
        ...d,
        profile: { ...d.profile, name: account.full_name, college: college.trim(), degree: degree.trim(), gradYear: gradYear.trim(), photo, resumeName: resume.name, resumeSize: resume.size },
        career: { ...d.career, role: role.trim(), goals: goals.trim() },
      }));
      setStatus(persisted ? { tone: "ok", text: "Account profile saved to Oracy and synced to this browser." } : { tone: "bad", text: "The account profile was saved, but browser-only photo/preferences could not be persisted." });
    } catch (error) {
      setStatus({ tone: "bad", text: error instanceof Error ? `Could not save to your account: ${error.message}` : "Could not save profile to the backend." });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Your name, education and career goals are saved to your account. Photo and some preferences remain local to this browser." />

      <div className="grid gap-6 lg:grid-cols-12">
        <form onSubmit={onSubmit} noValidate className="space-y-6 lg:col-span-8">
          <Card labelledBy="pr-photo">
            <CardHeader id="pr-photo" title="Photo and name" />
            <div className="flex flex-wrap items-center gap-5">
              <Avatar name={name || session.name} photo={photo} size={72} />
              <div>
                <input ref={photoInput} id="photo-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} className="sr-only" />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" className="px-5 py-2.5" onClick={() => photoInput.current?.click()}><Icon name="upload" className="h-4 w-4" /> {photo ? "Change photo" : "Upload photo"}</Button>
                  {photo && <Button type="button" variant="ghost" className="px-3 py-2.5" onClick={() => setPhoto("")}>Remove</Button>}
                </div>
                <p className="mt-2 text-xs text-sub">PNG, JPG or WebP, up to {MAX_PHOTO_KB} KB. Kept in this browser.</p>
                {errors.photo && <p role="alert" className="mt-1 text-sm text-bad">{errors.photo}</p>}
              </div>
            </div>
            <div className="mt-6"><TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" maxLength={60} /></div>
            <p className="mt-3 text-sm text-sub">Email: {session.email}</p>
          </Card>

          <Card labelledBy="pr-edu">
            <CardHeader id="pr-edu" title="Education" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><TextField label="College" value={college} onChange={(e) => setCollege(e.target.value)} error={errors.college} placeholder="e.g. Delhi Technological University" maxLength={80} /></div>
              <div>
                <TextField label="Degree" list="degrees" value={degree} onChange={(e) => setDegree(e.target.value)} error={errors.degree} placeholder="e.g. B.Tech / B.E." maxLength={60} />
                <datalist id="degrees">{degrees.map((d) => <option key={d} value={d} />)}</datalist>
              </div>
              <TextField label="Graduation year" inputMode="numeric" value={gradYear} onChange={(e) => setGradYear(e.target.value)} error={errors.gradYear} placeholder="e.g. 2027" maxLength={4} />
            </div>
          </Card>

          <Card labelledBy="pr-career">
            <CardHeader id="pr-career" title="Career preferences" />
            <div className="space-y-5">
              <div>
                <TextField label="Target job role" list="profile-roles" value={role} onChange={(e) => setRole(e.target.value)} error={errors.role} placeholder="e.g. Backend Engineer" maxLength={60} />
                <datalist id="profile-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
              </div>
              <TextAreaField label="Career goals" value={goals} onChange={(e) => setGoals(e.target.value)} error={errors.goals} hint={`${goals.trim().length}/280 characters. Companies and deadlines are edited in Career Launchpad.`} />
            </div>
          </Card>

          <Card labelledBy="pr-resume">
            <CardHeader id="pr-resume" title="Resume" subtitle={`PDF or DOCX, up to ${MAX_RESUME_MB} MB.`} />
            <input ref={resumeInput} id="resume-file" type="file" accept=".pdf,.docx" onChange={onResume} className="sr-only" />
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-cobalt/30 bg-surface/50 p-4">
              <Icon name="upload" className="h-5 w-5 text-cobalt" />
              <div className="min-w-0 flex-1 text-sm">
                {resume.name ? <><p className="truncate font-medium text-ink">{resume.name}</p><p className="text-sub">{(resume.size / 1024).toFixed(0)} KB · selected</p></> : <p className="text-sub">No resume selected.</p>}
              </div>
              <Button type="button" variant="outline" className="px-5 py-2.5" onClick={() => resumeInput.current?.click()}>{resume.name ? "Replace" : "Choose file"}</Button>
              {resume.name && <Button type="button" variant="ghost" className="px-3 py-2.5" onClick={() => setResume({ name: "", size: 0 })}>Remove</Button>}
            </div>
            {errors.resume && <p role="alert" className="mt-2 text-sm text-bad">{errors.resume}</p>}
            <p className="mt-3 text-xs text-sub">Only the file name and size are remembered in this browser. The original resume is not stored by this profile form.</p>
          </Card>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit">Save profile</Button>
            {status && <div className="min-w-0 flex-1"><Notice tone={status.tone}>{status.text}</Notice></div>}
          </div>
        </form>

        <aside className="lg:col-span-4">
          <Card labelledBy="pr-comp" className="lg:sticky lg:top-24">
            <CardHeader id="pr-comp" title="Profile completion" />
            <p className="font-display text-5xl text-ink">{completion.percent}<span className="text-2xl text-sub">%</span></p>
            <div className="mt-3"><ProgressBar value={completion.percent} label={`Profile ${completion.percent}% complete`} tone={completion.percent === 100 ? "ok" : "blue"} /></div>
            <p className="mt-3 text-sm text-sub">Based on your saved details. Save the form to update it.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {[...profileCompletionList(data)].map((f) => (
                <li key={f.key} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${f.filled ? "bg-ok text-white" : "border border-line text-transparent"}`}><Icon name="check" className="h-3 w-3" /></span>
                  <span className={f.filled ? "text-ink" : "text-sub"}>{f.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function profileCompletionList(d: ReturnType<typeof useDashboard>["data"]) {
  const missing = new Set(profileCompletion(d).missing.map((m) => m.key));
  return [
    { key: "photo", label: "Profile photo" },
    { key: "name", label: "Full name" },
    { key: "college", label: "College" },
    { key: "degree", label: "Degree" },
    { key: "gradYear", label: "Graduation year" },
    { key: "role", label: "Target role" },
    { key: "goals", label: "Career goals" },
    { key: "resume", label: "Resume" },
  ].map((f) => ({ ...f, filled: !missing.has(f.key) }));
}
