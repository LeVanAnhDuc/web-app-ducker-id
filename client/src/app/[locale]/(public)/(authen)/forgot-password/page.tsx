// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// components
import ForgotPassword from "@/views/ForgotPasswords/ForgotPassword";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forgotPassword" });

  return {
    title: t("title")
  };
}

export default ForgotPassword;
