"use client";

import Link from "next/link";
import { AuthShell } from "@/features/auth/AuthShell";
import { SignUpForm } from "@/features/auth/SignUpForm";
import { useTranslation } from "@/features/i18n/LanguageContext";

export default function SignUpPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t("auth.signUp.title")}
      subtitle={t("auth.signUp.subtitle")}
      footer={
        <>
          {t("auth.signUp.hasAccount")}{" "}
          <Link href="/login" className="text-cobalt underline-offset-4 hover:underline">
            {t("auth.signUp.signInLink")}
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
