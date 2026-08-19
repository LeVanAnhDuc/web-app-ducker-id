// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { ForgotPasswordMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import RecoveryOptionOtp from "./mains/RecoveryOptionOtp";
import RecoveryOptionMagicLink from "./mains/RecoveryOptionMagicLink";
import RecoveryOptionTwoFactor from "./mains/RecoveryOptionTwoFactor";
import RecoveryOptionContactAdmin from "./mains/RecoveryOptionContactAdmin";
// others
import { Link } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;
const ANIMATION_DELAY_STEP = 0.1;

const ForgotPassword = async ({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) => {
  const { email } = await searchParams;

  if (!email) redirect(LOGIN);

  const decodedEmail = decodeURIComponent(email);

  const messages = await getMessages();
  const translations = messages.forgotPassword as ForgotPasswordMessages;
  const { description, otp, magicLink, twoFactor, contactAdmin, changeEmail } =
    translations.form.options;
  const { unavailable } = translations.badge;

  return (
    <AuthStepLayout
      title={translations.form.options.title}
      description={description}
      email={decodedEmail}
    >
      <div className="space-y-5">
        <RecoveryOptionOtp
          email={decodedEmail}
          title={otp.title}
          description={otp.description}
          delay={0}
        />
        <RecoveryOptionMagicLink
          email={decodedEmail}
          title={magicLink.title}
          description={magicLink.description}
          delay={ANIMATION_DELAY_STEP}
        />
        <RecoveryOptionTwoFactor
          title={twoFactor.title}
          descriptionEnabled={twoFactor.descriptionEnabled}
          descriptionDisabled={twoFactor.descriptionDisabled}
          unavailableLabel={unavailable}
          delay={ANIMATION_DELAY_STEP * 2}
        />
        <RecoveryOptionContactAdmin
          email={decodedEmail}
          title={contactAdmin.title}
          description={contactAdmin.description}
          delay={ANIMATION_DELAY_STEP * 3}
        />
        <div className="text-center">
          <Link
            href={LOGIN}
            className="text-primary text-sm transition-colors duration-200 hover:underline"
          >
            {changeEmail}
          </Link>
        </div>
      </div>
    </AuthStepLayout>
  );
};

export default ForgotPassword;
