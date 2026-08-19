// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { LoginMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import PasswordStepForm from "./mains/PasswordStepForm";
// others
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;

const LoginPassword = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) => {
  const { email } = await searchParams;

  if (!email) redirect(LOGIN);

  const decodedEmail = decodeURIComponent(email);
  const messages = await getMessages();
  const translations = messages.login as LoginMessages;

  return (
    <AuthStepLayout
      title={translations.form.titlePassword}
      email={decodedEmail}
    >
      <PasswordStepForm email={decodedEmail} translations={translations} />
    </AuthStepLayout>
  );
};

export default LoginPassword;
