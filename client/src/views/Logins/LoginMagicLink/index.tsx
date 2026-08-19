// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { LoginMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import MagicLinkForm from "./mains/MagicLinkForm";
import MagicLinkInstructions from "./components/MagicLinkInstructions";
// others
import CONSTANTS from "@/constants";

const { LOGIN, LOGIN_ALTERNATIVE } = CONSTANTS.ROUTES;

const LoginMagicLink = async ({
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
  const { magicLink } = translations.form;

  return (
    <AuthStepLayout
      title={magicLink.title}
      description={magicLink.subtitle}
      email={decodedEmail}
    >
      <MagicLinkInstructions
        minutes={CONSTANTS.LOGIN.MAGIC_LINK_EXPIRY_MINUTES}
      />
      <MagicLinkForm
        email={decodedEmail}
        tryOtherHref={tryOtherHref}
        translations={translations}
      />
    </AuthStepLayout>
  );
};

export default LoginMagicLink;
