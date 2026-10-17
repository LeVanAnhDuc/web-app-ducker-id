// libs
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import UnlockFlow from "./mains/UnlockFlow";
// others
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;

const LoginUnlock = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) => {
  const { email } = await searchParams;

  if (!email) redirect(LOGIN);

  const decodedEmail = decodeURIComponent(email);
  const t = await getTranslations("login.unlock");

  return (
    <AuthStepLayout title={t("title")} email={decodedEmail}>
      <UnlockFlow email={decodedEmail} />
    </AuthStepLayout>
  );
};

export default LoginUnlock;
