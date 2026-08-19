// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { SignupMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import InfoStepForm from "./mains/InfoStepForm";
// others
import CONSTANTS from "@/constants";

const { SIGNUP } = CONSTANTS.ROUTES;

const SignupInfo = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string; sessionToken?: string }>;
}) => {
  const { email, sessionToken } = await searchParams;

  if (!email || !sessionToken) redirect(SIGNUP);

  const decodedEmail = decodeURIComponent(email);
  const messages = await getMessages();
  const translations = messages.signup as SignupMessages;

  return (
    <AuthStepLayout title={translations.infoStep.title} email={decodedEmail}>
      <InfoStepForm
        email={decodedEmail}
        sessionToken={sessionToken}
        translations={translations}
      />
    </AuthStepLayout>
  );
};

export default SignupInfo;
