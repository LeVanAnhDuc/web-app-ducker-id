// libs
import { getTranslations } from "next-intl/server";
// types
import type { Metadata } from "next";
import type { Locale } from "@/types/I18n";
// views
import MyContactDetail from "@/views/MyContactDetail";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "contactAdmin.myContacts.detail"
  });

  return {
    title: t("title")
  };
}

export default async function Page({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MyContactDetail id={id} />;
}
