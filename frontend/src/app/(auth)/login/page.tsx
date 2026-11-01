"use client";

import Link from "next/link";
import { AuthShell } from "@/features/auth/AuthShell";
import { SignInForm } from "@/features/auth/SignInForm";
import { useTranslation } from "@/features/i18n/LanguageContext";

export default function SignInPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t("auth.signIn.title")}
      subtitle={t("auth.signIn.subtitle")}
      footer={
        <div className="space-y-3">
          <p>
            {t("auth.signIn.noAccount")}{" "}
            <Link href="/signup" className="text-cobalt underline-offset-4 hover:underline">
              {t("auth.signIn.signUpLink")}
            </Link>
          </p>
          <p>
            <Link href="/admin/login" className="font-medium text-cobalt underline-offset-4 hover:underline">
              {t("nav.admin")}
            </Link>
          </p>
        </div>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}
