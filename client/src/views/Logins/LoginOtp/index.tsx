// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { LoginMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import OtpStepForm from "./mains/OtpStepForm";
// others
import CONSTANTS from "@/constants";

const { LOGIN, LOGIN_ALTERNATIVE } = CONSTANTS.ROUTES;

const LoginOtp = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) => {
  const { email } = await searchParams;

  if (!email) {
    redirect(LOGIN);
  }

  const decodedEmail = decodeURIComponent(email);
  const encodedEmail = encodeURIComponent(decodedEmail);
  const tryOtherHref = `${LOGIN_ALTERNATIVE}?email=${encodedEmail}`;

  const messages = await getMessages();
  const translations = messages.login as LoginMessages;
  const { form } = translations;
  const { otp } = form;

  return (
    <AuthStepLayout
      title={otp.title}
      description={otp.description}
      email={decodedEmail}
    >
      <OtpStepForm
        email={decodedEmail}
        tryOtherHref={tryOtherHref}
        translations={translations}
      />
    </AuthStepLayout>
  );
};

export default LoginOtp;
