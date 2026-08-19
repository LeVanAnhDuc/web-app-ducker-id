// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { SignupMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import OtpStepForm from "./mains/OtpStepForm";
// others
import CONSTANTS from "@/constants";

const { SIGNUP } = CONSTANTS.ROUTES;

const SignupOtp = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) => {
  const { email } = await searchParams;

  if (!email) redirect(SIGNUP);

  const decodedEmail = decodeURIComponent(email);
  const messages = await getMessages();
  const translations = messages.signup as SignupMessages;
  const { otpStep } = translations;

  return (
    <AuthStepLayout
      title={otpStep.title}
      description={otpStep.description}
      email={decodedEmail}
    >
      <OtpStepForm
        email={decodedEmail}
        changeEmailHref={SIGNUP}
        translations={translations}
      />
    </AuthStepLayout>
  );
};

export default SignupOtp;
