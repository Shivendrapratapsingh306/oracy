"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Icon, type IconName } from "@/components/dashboard/Icon";

/* ---------- layout ---------- */

export function Card({ children, className = "", labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className={`min-w-0 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ id, title, subtitle, badge, action }: { id?: string; title: string; subtitle?: string; badge?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={id} className="font-display text-2xl leading-tight text-ink">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sub">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/* ---------- small elements ---------- */

type Tone = "info" | "ok" | "warn" | "bad" | "neutral";
const tones: Record<Tone, string> = {
  info: "border-cobalt/20 bg-surface text-cobalt-deep",
  ok: "border-ok/30 bg-ok/10 text-emerald-700",
  warn: "border-warn/40 bg-warn/10 text-amber-700",
  bad: "border-bad/30 bg-bad/10 text-bad",
  neutral: "border-line bg-paper text-sub",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, label, tone = "blue" }: { value: number; label: string; tone?: "blue" | "ok" | "warn" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const fill = tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-gradient-to-r from-cobalt to-[#4F82F5]";
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full transition-[width] duration-700 ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";
  const style = { width: size, height: size };
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" style={style} className="shrink-0 rounded-full border border-line object-cover" />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.38 }} aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full border border-cobalt/20 bg-surface font-medium text-cobalt">
      {initials}
    </span>
  );
}

export function EmptyState({ icon = "sparkle", title, text, action }: { icon?: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-cobalt/25 bg-surface/50 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-cobalt shadow-card"><Icon name={icon} /></span>
      <h3 className="mt-4 font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-sub">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "bad" | "info"; children: ReactNode }) {
  const cls = tone === "ok" ? "border-ok/30 bg-ok/10 text-emerald-800" : tone === "bad" ? "border-bad/30 bg-bad/10 text-bad" : "border-cobalt/20 bg-surface text-cobalt-deep";
  return <p role={tone === "bad" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}

/* ---------- form controls ---------- */

const control =
  "w-full rounded-xl border bg-card px-4 py-3 text-[0.95rem] text-ink placeholder:text-mute-2 transition focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/25";
const labelClass = "mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-sub";

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) return <p id={`${id}-err`} className="mt-2 text-sm text-bad">{error}</p>;
  if (hint) return <p id={`${id}-hint`} className="mt-2 text-sm text-sub">{hint}</p>;
  return null;
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & { label: string; error?: string; hint?: string; options: { value: string; label: string }[]; hideLabel?: boolean };

export function SelectField({ label, error, hint, options, hideLabel, ...rest }: SelectProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : labelClass}>{label}</label>
      <select id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={`${control} ${error ? "border-bad" : "border-line"}`} {...rest}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { label: string; error?: string; hint?: string };

export function TextAreaField({ label, error, hint, ...rest }: AreaProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <textarea id={id} rows={4} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={`${control} resize-y ${error ? "border-bad" : "border-line"}`} {...rest} />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p id={`${id}-l`} className="text-sm font-medium text-ink">{label}</p>
        {description && <p id={`${id}-d`} className="mt-0.5 text-sm text-sub">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition ${checked ? "border-cobalt bg-cobalt" : "border-line bg-line"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/* ---------- dialog ---------- */

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Accessible modal: focus moves in, Tab is trapped, Escape closes, focus returns on close. */
export function Modal({ onClose, title, description, children }: { onClose: () => void; title: string; description?: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-lift sm:rounded-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-2xl text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-sub">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-sub transition hover:border-cobalt hover:text-cobalt">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
