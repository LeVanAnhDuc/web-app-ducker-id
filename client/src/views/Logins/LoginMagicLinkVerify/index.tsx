// libs
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
// types
import type { LoginMessages } from "@/types/libs";
// components
import AuthStepLayout from "@/components/AuthStepLayout";
import { Spinner } from "@/components/ui/spinner";
// ghosts
import VerifyMagicLinkEffect from "./ghosts/VerifyMagicLinkEffect";
// others
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;

const LoginMagicLinkVerify = async ({
  searchParams
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) => {
  const { token, email } = await searchParams;

  if (!token || !email) {
    redirect(LOGIN);
  }

  const decodedEmail = decodeURIComponent(email);

  const messages = await getMessages();
  const translations = messages.login as LoginMessages;
  const { titleVerifying } = translations.form.magicLink;

  return (
    <AuthStepLayout title={titleVerifying} email={decodedEmail}>
      <div className="flex justify-center py-4">
        <Spinner className="size-8" />
      </div>
      <VerifyMagicLinkEffect email={decodedEmail} token={token} />
    </AuthStepLayout>
  );
};

export default LoginMagicLinkVerify;
