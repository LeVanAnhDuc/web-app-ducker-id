// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// components
import Apps from "@/views/Apps";
// requests
import { getServerAppCategories } from "@/requests/server/apps";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "apps" });
  return {
    title: t("title"),
    description: t("description")
  };
}

const AppsPage = async () => {
  const categories = await getServerAppCategories();
  return <Apps categories={categories} />;
};

export default AppsPage;
