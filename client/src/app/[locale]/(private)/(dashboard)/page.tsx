// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// components
import Home from "@/views/Home";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("title"),
    description: t("description")
  };
}

export default Home;
