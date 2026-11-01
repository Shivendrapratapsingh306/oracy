"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/dashboard/Icon";
import { Badge, Modal, TextAreaField } from "@/components/dashboard/ui";
import { TextField } from "@/components/forms/Field";
import { useDashboard } from "@/features/dashboard/DashboardContext";
import { ROLES } from "@/lib/dashboard-data";
import { validateFutureDate, validateOptionalText, validateRequiredText } from "@/lib/validation";

/** Mount only while open so the draft re-initialises each time. */
export function CareerEditModal({ onClose, onSaved }: { onClose: () => void; onSaved: (persisted: boolean) => void }) {
  const { data, update, today } = useDashboard();
  const [role, setRole] = useState(data.career.role);
  const [companies, setCompanies] = useState(data.career.companies);
  const [companyInput, setCompanyInput] = useState("");
  const [goals, setGoals] = useState(data.career.goals);
  const [deadline, setDeadline] = useState(data.career.deadline);
  const [errors, setErrors] = useState<{ role?: string; company?: string; goals?: string; deadline?: string }>({});

  function addCompany(): string | undefined {
    const name = companyInput.trim();
    if (!name) return undefined;
    if (name.length > 40) return "Keep a company name under 40 characters.";
    if (companies.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setCompanyInput("");
      return undefined;
    }
    if (companies.length >= 8) return "You can add up to 8 companies.";
    setCompanies((c) => [...c, name]);
    setCompanyInput("");
    return undefined;
  }

  function onCompanyKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      setErrors((x) => ({ ...x, company: addCompany() }));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const companyError = addCompany();
    const next = {
      role: validateRequiredText(role, "a target role", 2, 60),
      company: companyError,
      goals: validateOptionalText(goals, "career goals", 280),
      deadline: validateFutureDate(deadline, today),
    };
    setErrors(next);
    if (next.role || next.company || next.goals || next.deadline) return;
    const pending = companyInput.trim();
    const finalCompanies = pending && !companies.some((c) => c.toLowerCase() === pending.toLowerCase()) ? [...companies, pending] : companies;
    const persisted = update((d) => ({ ...d, career: { ...d.career, role: role.trim(), companies: finalCompanies.slice(0, 8), goals: goals.trim(), deadline } }));
    onSaved(persisted);
    onClose();
  }

  return (
    <Modal onClose={onClose} title="Edit career goals" description="These preferences shape your practice guidance and skill checklist. Saved in this browser.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <TextField label="Target job role" list="career-roles" value={role} onChange={(e) => setRole(e.target.value)} error={errors.role} placeholder="e.g. Backend Engineer" maxLength={60} data-autofocus />
          <datalist id="career-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
        </div>

        <div>
          <TextField
            label="Target companies"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            onKeyDown={onCompanyKey}
            error={errors.company}
            hint="Press Enter or Add after each company. Up to 8."
            placeholder="e.g. Atlassian"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="px-4 py-2" onClick={() => setErrors((x) => ({ ...x, company: addCompany() }))}>
              <Icon name="plus" className="h-4 w-4" /> Add company
            </Button>
            {companies.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full border border-cobalt/20 bg-surface py-1 pl-3 pr-1 text-xs font-medium text-cobalt-deep">
                {c}
                <button type="button" onClick={() => setCompanies((list) => list.filter((x) => x !== c))} aria-label={`Remove ${c}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-cobalt/10">
                  <Icon name="x" className="h-3 w-3" />
                </button>
              </span>
            ))}
            {companies.length === 0 && <Badge>None added</Badge>}
          </div>
        </div>

        <TextAreaField label="Career goals" value={goals} onChange={(e) => setGoals(e.target.value)} error={errors.goals} hint={`${goals.trim().length}/280 characters`} placeholder="e.g. Land a backend internship before final year." />

        <TextField label="Preparation deadline" type="date" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} error={errors.deadline} hint="Optional. When do you want to be interview-ready?" />

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save goals</Button>
        </div>
      </form>
    </Modal>
  );
}
