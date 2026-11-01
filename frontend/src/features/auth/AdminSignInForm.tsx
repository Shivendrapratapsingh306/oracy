"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Icons";
import { PasswordField, TextField } from "@/components/forms/Field";
import { validateEmail } from "@/lib/validation";
import { useRedirectIfSignedIn } from "@/features/auth/useRedirectIfSignedIn";
import { adminSignIn } from "@/services/auth";
import { useTranslation } from "@/features/i18n/LanguageContext";

export function AdminSignInForm() {
  useRedirectIfSignedIn();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const emailError = validateEmail(email);
    if (emailError || !password) {
      setError(emailError ? t("auth.validation.emailInvalid") : t("auth.validation.required"));
      return;
    }
    setLoading(true);
    try {
      const session = await adminSignIn({ email: email.trim(), password });
      if (session.role !== "admin") throw new Error("This account does not have administrator access.");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate aria-busy={loading}>
      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      <TextField
        label={t("auth.adminSignIn.email")}
        type="email"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="admin@oracy.ai"
      />
      <PasswordField
        label={t("auth.adminSignIn.password")}
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={t("auth.signIn.passwordPlaceholder")}
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Spinner /> {t("auth.adminSignIn.submitting")}
          </>
        ) : (
          t("auth.adminSignIn.submit")
        )}
      </Button>
    </form>
  );
}
