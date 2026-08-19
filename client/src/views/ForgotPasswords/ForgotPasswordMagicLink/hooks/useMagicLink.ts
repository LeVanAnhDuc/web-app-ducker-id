"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// requests
import { sendForgotPasswordMagicLink } from "@/requests/forgotPassword";
// hooks
import { useCountdown, useAnnounce } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { RESEND_COUNTDOWN } = CONSTANTS.FORGOT_PASSWORD;

export const useMagicLink = ({
  email,
  messages
}: {
  email: string;
  messages: {
    resendSuccess: string;
  };
}) => {
  const tAnnounce = useTranslations("forgotPassword.announce");
  const { announce } = useAnnounce();
  const {
    seconds: countdown,
    isFinished: canResend,
    reset: resetCountdown
  } = useCountdown(RESEND_COUNTDOWN);

  const { mutate: sendMagicLink, isPending: isResending } = useMutation({
    mutationFn: () => sendForgotPasswordMagicLink(email),
    onMutate: () => {
      announce(tAnnounce("sendingLink"));
    },
    onSuccess: () => {
      announce(tAnnounce("linkSent"));
      toast.success(messages.resendSuccess);
      resetCountdown();
    }
  });

  return {
    countdown,
    canResend,
    isResending,
    handleResend: sendMagicLink
  };
};
