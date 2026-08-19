// libs
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
// types
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import type { Locale } from "@/types/I18n";
// components
import { Toaster } from "@/components/ui/sonner";
import SessionGate from "@/layouts/SessionGate";
// contexts
import AppProvider from "@/contexts/AppProvider";
// others
import { routing } from "@/i18n/routing";
import "./globals.css";

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ]
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    ),
    title: {
      default: t("app.name"),
      template: `%s — ${t("app.name")}`
    },
    description: t("app.description"),
    robots: { index: true, follow: true }
  };
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
        >
          {t("skipToContent")}
        </a>
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="announcer"
        />
        <AppProvider>
          <NextIntlClientProvider>
            <SessionGate>{children}</SessionGate>
          </NextIntlClientProvider>
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
