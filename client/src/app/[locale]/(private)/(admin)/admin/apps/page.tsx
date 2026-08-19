// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// views
import AdminApps from "@/views/AdminApps";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminApps" });
  return {
    title: t("title"),
    description: t("description")
  };
}

export default AdminApps;
