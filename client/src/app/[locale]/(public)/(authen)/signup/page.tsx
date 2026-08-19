// libs
import { redirect } from "next/navigation";
// types
import type { Locale } from "@/types/I18n";

export default async function SignupPage({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}
