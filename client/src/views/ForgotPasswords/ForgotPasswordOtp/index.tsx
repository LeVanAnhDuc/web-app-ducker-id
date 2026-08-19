// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { ForgotPasswordMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import OtpStepForm from "./mains/OtpStepForm";
// others
import CONSTANTS from "@/constants";

const { FORGOT_PASSWORD } = CONSTANTS.ROUTES;

const ForgotPasswordOtp = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) => {
  const { email } = await searchParams;

  if (!email) redirect(FORGOT_PASSWORD);

  const decodedEmail = decodeURIComponent(email);
  const encodedEmail = encodeURIComponent(decodedEmail);
  const tryOtherHref = `${FORGOT_PASSWORD}?email=${encodedEmail}`;

  const messages = await getMessages();
  const translations = messages.forgotPassword as ForgotPasswordMessages;
  const { otp } = translations.form;

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

export default ForgotPasswordOtp;
