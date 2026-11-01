"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Icons";
import { PasswordField, TextField } from "@/components/forms/Field";
import { validateEmail } from "@/lib/validation";
import { useRedirectIfSignedIn } from "@/features/auth/useRedirectIfSignedIn";
import { signIn } from "@/services/auth";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function SignInForm() {
  useRedirectIfSignedIn();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      email: validateEmail(email) ? t("auth.validation.emailInvalid") : undefined,
      password: password ? undefined : t("auth.validation.required"),
    };
    setErrors(next);
    setServerError(null);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      const session = await signIn({ email, password });
      router.push(session.role === "admin" ? "/admin" : "/dashboard");
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
        label={t("auth.signIn.email")}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) ? t("auth.validation.emailInvalid") : undefined }))}
        error={errors.email}
        placeholder={t("auth.signIn.emailPlaceholder")}
      />
      <PasswordField
        label={t("auth.signIn.password")}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        placeholder={t("auth.signIn.passwordPlaceholder")}
      />
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-mute transition hover:text-cobalt">
          {t("auth.signIn.forgotPassword")}
        </Link>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Spinner /> {t("auth.signIn.submitting")}
          </>
        ) : (
          t("auth.signIn.submit")
        )}
      </Button>
    </form>
  );
}
