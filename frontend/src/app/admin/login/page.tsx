"use client";

import Link from "next/link";
import { AuthShell } from "@/features/auth/AuthShell";
import { AdminSignInForm } from "@/features/auth/AdminSignInForm";
import { useTranslation } from "@/features/i18n/LanguageContext";

export default function AdminLoginPage() {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t("auth.adminSignIn.title")}
      subtitle={t("auth.adminSignIn.subtitle")}
      footer={
        <>
          {t("auth.adminSignIn.studentNotice")}{" "}
          <Link href="/login" className="text-cobalt underline-offset-4 hover:underline">
            {t("auth.adminSignIn.studentLink")}
          </Link>
        </>
      }
    >
      <AdminSignInForm />
    </AuthShell>
  );
}
