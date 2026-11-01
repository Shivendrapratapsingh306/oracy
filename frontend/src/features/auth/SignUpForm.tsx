"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Icons";
import { PasswordField, TextField } from "@/components/forms/Field";
import { validateConfirm, validateEmail, validateName, validatePassword } from "@/lib/validation";
import { useRedirectIfSignedIn } from "@/features/auth/useRedirectIfSignedIn";
import { signUp } from "@/services/auth";
import { useTranslation } from "@/features/i18n/LanguageContext";

type Errors = { name?: string; email?: string; password?: string; confirm?: string; ack?: string };

export function SignUpForm() {
  useRedirectIfSignedIn();
  const router = useRouter();
  const { t } = useTranslation();
  const [v, setV] = useState({ name: "", email: "", password: "", confirm: "" });
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {
      name: validateName(v.name) ? t("auth.validation.required") : undefined,
      email: validateEmail(v.email) ? t("auth.validation.emailInvalid") : undefined,
      password: validatePassword(v.password) ? t("auth.validation.passwordShort") : undefined,
      confirm: validateConfirm(v.password, v.confirm) ? t("auth.validation.passwordMismatch") : undefined,
      ack: ack ? undefined : t("auth.validation.termsRequired"),
    };
    setErrors(next);
    setServerError(null);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      await signUp({ name: v.name, email: v.email, password: v.password });
      router.push("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("common.error"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-busy={loading}>
      {serverError && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {serverError}
        </div>
      )}
      <TextField
        label={t("auth.signUp.name")}
        autoComplete="name"
        value={v.name}
        onChange={set("name")}
        onBlur={() => setErrors((p) => ({ ...p, name: validateName(v.name) ? t("auth.validation.required") : undefined }))}
        error={errors.name}
        placeholder={t("auth.signUp.namePlaceholder")}
      />
      <TextField
        label={t("auth.signUp.email")}
        type="email"
        autoComplete="email"
        value={v.email}
        onChange={set("email")}
        onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(v.email) ? t("auth.validation.emailInvalid") : undefined }))}
        error={errors.email}
        placeholder={t("auth.signUp.emailPlaceholder")}
      />
      <PasswordField
        label={t("auth.signUp.password")}
        autoComplete="new-password"
        value={v.password}
        onChange={set("password")}
        onBlur={() => setErrors((p) => ({ ...p, password: validatePassword(v.password) ? t("auth.validation.passwordShort") : undefined }))}
        error={errors.password}
        placeholder={t("auth.signUp.passwordPlaceholder")}
      />
      <PasswordField
        label={t("auth.signUp.confirmPassword")}
        autoComplete="new-password"
        value={v.confirm}
        onChange={set("confirm")}
        error={errors.confirm}
        placeholder={t("auth.signUp.confirmPasswordPlaceholder")}
      />

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/75">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            aria-invalid={errors.ack ? true : undefined}
            className="mt-0.5 h-4 w-4 accent-cobalt"
          />
          <span>{t("auth.signUp.agreeTerms")}</span>
        </label>
        {errors.ack && <p className="mt-2 text-sm text-red-600">{errors.ack}</p>}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Spinner /> {t("auth.signUp.submitting")}
          </>
        ) : (
          t("auth.signUp.submit")
        )}
      </Button>
    </form>
  );
}
