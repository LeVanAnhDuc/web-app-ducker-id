"use client";

// types
import type { ForgotPasswordMessages } from "@/types/libs";
// components
import ResendButton from "@/components/ResendButton";
import MagicLinkInstructions from "../../components/MagicLinkInstructions";
// hooks
import { useMagicLink } from "../../hooks/useMagicLink";

const MagicLinkForm = ({
  email,
  tryOtherHref,
  translations
}: {
  email: string;
  tryOtherHref: string;
  translations: ForgotPasswordMessages;
}) => {
  const {
    instruction: { checkEmail, clickLink },
    checkSpam,
    button: { resend, resendIn, sending, tryOther },
    resendSuccess
  } = translations.form.magicLink;
  const { countdown, canResend, isResending, handleResend } = useMagicLink({
    email,
    messages: { resendSuccess }
  });

  return (
    <>
      <MagicLinkInstructions labels={{ checkEmail, clickLink, checkSpam }} />

      <ResendButton
        countdown={countdown}
        canResend={canResend}
        isResending={isResending}
        onResend={handleResend}
        tryOtherHref={tryOtherHref}
        labels={{ resend, resendIn, sending, tryOther }}
      />
    </>
  );
};

export default MagicLinkForm;
