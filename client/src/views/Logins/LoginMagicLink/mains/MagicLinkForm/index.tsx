"use client";

// types
import type { LoginMessages } from "@/types/libs";
// components
import ResendButton from "@/components/ResendButton";
// hooks
import { useMagicLinkLogin } from "../../hooks/useMagicLinkLogin";

const MagicLinkForm = ({
  email,
  tryOtherHref,
  translations
}: {
  email: string;
  tryOtherHref: string;
  translations: LoginMessages;
}) => {
  const {
    button: { resend, resendIn, sending, tryOther },
    resendSuccess
  } = translations.form.magicLink;

  const { sendMagicLink, isSending, countdown, canResend } = useMagicLinkLogin({
    email,
    resendSuccessMessage: resendSuccess
  });

  return (
    <ResendButton
      countdown={countdown}
      canResend={canResend}
      isResending={isSending}
      onResend={sendMagicLink}
      tryOtherHref={tryOtherHref}
      labels={{ resend, resendIn, sending, tryOther }}
    />
  );
};

export default MagicLinkForm;
