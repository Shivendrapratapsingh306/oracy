"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Icons";
import { TextField } from "@/components/forms/Field";
import { validateEmail } from "@/lib/validation";
import { useRedirectIfSignedIn } from "@/features/auth/useRedirectIfSignedIn";
import { requestPasswordReset } from "@/services/auth";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function ForgotPasswordForm() {
  useRedirectIfSignedIn();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateEmail(email) ? t("auth.validation.emailInvalid") : undefined;
    setError(err);
    setServerError(null);
    if (err) return;

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setDone(true);
    } catch (e2) {
      setServerError(e2 instanceof Error ? e2.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-3xl">{t("auth.forgotPassword.sentSuccess")}</h2>
        <p className="mt-3 text-ink/75">{email.trim()}</p>
        <Link href="/login" className="mt-5 inline-block text-cobalt underline-offset-4 hover:underline">
          {t("auth.forgotPassword.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-busy={loading}>
      {serverError && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {serverError}
        </div>
      )}
      <TextField
        label={t("auth.forgotPassword.email")}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        placeholder={t("auth.forgotPassword.emailPlaceholder")}
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Spinner /> {t("auth.forgotPassword.submitting")}
          </>
        ) : (
          t("auth.forgotPassword.submit")
        )}
      </Button>
    </form>
  );
}
