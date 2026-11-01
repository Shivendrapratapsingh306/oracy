"use client";

import Link from "next/link";
import { AuthShell } from "@/features/auth/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import { useTranslation } from "@/features/i18n/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t("auth.forgotPassword.title")}
      subtitle={t("auth.forgotPassword.subtitle")}
      footer={
        <>
          <Link href="/login" className="text-cobalt underline-offset-4 hover:underline">
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
