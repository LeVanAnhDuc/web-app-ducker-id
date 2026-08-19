// libs
import { getTranslations } from "next-intl/server";
// types
import type { Locale } from "@/types/I18n";
// views
import AdminEntitlements from "@/views/AdminEntitlements";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminEntitlements" });
  return {
    title: t("title"),
    description: t("subtitle")
  };
}

export default AdminEntitlements;
