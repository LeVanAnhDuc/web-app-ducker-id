// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { ForgotPasswordResetMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import ForgotPasswordResetForm from "./mains/ForgotPasswordResetForm";
// others
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;

const ForgotPasswordReset = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string; token?: string; method?: string }>;
}) => {
  const { email, token, method } = await searchParams;

  // Security: Redirect if missing email or token
  if (!email || !token) redirect(LOGIN);

  const decodedEmail = decodeURIComponent(email);
  const decodedToken = decodeURIComponent(token);

  const messages = await getMessages();
  const translations =
    messages.forgotPasswordReset as ForgotPasswordResetMessages;

  return (
    <AuthStepLayout title={translations.form.title} email={decodedEmail}>
      <ForgotPasswordResetForm
        email={decodedEmail}
        token={decodedToken}
        method={method}
        translations={translations}
      />
    </AuthStepLayout>
  );
};

export default ForgotPasswordReset;
