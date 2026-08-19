// libs
import { getTranslations } from "next-intl/server";
// types
import type { ReactNode } from "react";
import type { Metadata } from "next";
import type { Locale } from "@/types/I18n";
// components
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function ForcePasswordLayout({
  children,
  params
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="auth-background flex min-h-screen flex-col items-center justify-center gap-6 p-4"
    >
      <div className="flex items-center gap-2">
        <Logo />
        <span className="text-foreground font-semibold">{t("app.name")}</span>
      </div>
      {children}
    </main>
  );
}
