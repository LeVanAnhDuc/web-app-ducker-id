"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// requests
import { sendLoginMagicLink } from "@/requests/login";
// hooks
import { useCountdown, useAnnounce } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const { RESEND_COUNTDOWN } = CONSTANTS.LOGIN;

export const useMagicLinkLogin = ({
  email,
  resendSuccessMessage
}: {
  email: string;
  resendSuccessMessage: string;
}) => {
  const tAnnounce = useTranslations("login.announce");
  const { announce } = useAnnounce();
  const {
    seconds: countdown,
    isFinished: canResend,
    reset: resetCountdown
  } = useCountdown(RESEND_COUNTDOWN);

  const { mutate: sendMagicLink, isPending: isSending } = useMutation({
    mutationFn: () => sendLoginMagicLink(email),
    onMutate: () => {
      announce(tAnnounce("sendingLink"));
    },
    onSuccess: () => {
      announce(tAnnounce("linkSent"));
      toast.success(resendSuccessMessage);
      resetCountdown();
    },
    onError: () => {
      announce(tAnnounce("linkSendError"));
    }
  });

  return { sendMagicLink, isSending, countdown, canResend };
};
