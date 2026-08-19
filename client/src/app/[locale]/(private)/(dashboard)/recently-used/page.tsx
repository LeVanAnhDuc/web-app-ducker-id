// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// components
import RecentlyUsed from "@/views/RecentlyUsed";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recentlyUsed" });
  return {
    title: t("title"),
    description: t("description")
  };
}

export default RecentlyUsed;
