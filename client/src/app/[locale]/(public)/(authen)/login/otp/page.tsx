// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// components
import LoginOtp from "@/views/Logins/LoginOtp";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });

  return {
    title: t("title")
  };
}

export default LoginOtp;
