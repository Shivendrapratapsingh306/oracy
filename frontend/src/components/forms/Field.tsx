"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { EyeIcon } from "@/components/Icons";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  error?: string;
  hint?: string;
};

const inputClass =
  "w-full rounded-xl border bg-card px-4 py-3.5 text-[0.95rem] text-ink placeholder:text-mute-2 transition focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/25";

export function TextField({ label, error, hint, ...rest }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-mute">
        {label}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={`${inputClass} ${error ? "border-red-400" : "border-line"}`} {...rest} />
      {error ? (
        <p id={`${id}-err`} className="mt-2 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export function PasswordField({ label, error, hint, ...rest }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-mute">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClass} pr-12 ${error ? "border-red-400" : "border-line"}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-mute transition hover:text-cobalt"
        >
          <EyeIcon off={visible} />
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-2 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-mute">{hint}</p>
      ) : null}
    </div>
  );
}
