// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { LoginMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import LoginOptionMagicLink from "./mains/LoginOptionMagicLink";
import LoginOptionOtp from "./mains/LoginOptionOtp";
import LoginOptionPassword from "./mains/LoginOptionPassword";
import LoginOptionContactAdmin from "./mains/LoginOptionContactAdmin";
import LoginOptionsInfo from "./mains/LoginOptionsInfo";
// others
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;
const ANIMATION_DELAY_STEP = 0.1;

const LoginAlternative = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) => {
  const { email } = await searchParams;

  if (!email) redirect(LOGIN);

  const decodedEmail = decodeURIComponent(email);

  const messages = await getMessages();
  const translations = messages.login as LoginMessages;
  const { form } = translations;
  const { magicLink, otp, password, contactAdmin } = form.alternative;

  return (
    <AuthStepLayout title={form.titleChooseMethod} email={decodedEmail}>
      <div className="space-y-5">
        <LoginOptionMagicLink
          email={decodedEmail}
          title={magicLink.title}
          description={magicLink.description}
          delay={0}
        />
        <LoginOptionOtp
          email={decodedEmail}
          title={otp.title}
          description={otp.description}
          delay={ANIMATION_DELAY_STEP}
        />
        <LoginOptionPassword
          email={decodedEmail}
          title={password.title}
          description={password.description}
          delay={ANIMATION_DELAY_STEP * 2}
        />
        <LoginOptionContactAdmin
          email={decodedEmail}
          title={contactAdmin.title}
          description={contactAdmin.description}
          delay={ANIMATION_DELAY_STEP * 3}
        />
      </div>
      <LoginOptionsInfo label={form.descriptionChooseMethod} />
    </AuthStepLayout>
  );
};

export default LoginAlternative;
