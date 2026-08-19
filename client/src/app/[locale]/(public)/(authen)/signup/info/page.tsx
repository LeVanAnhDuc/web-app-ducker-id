// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// components
import SignupInfo from "@/views/Signups/SignupInfo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signup" });

  return {
    title: t("title")
  };
}

export default SignupInfo;
