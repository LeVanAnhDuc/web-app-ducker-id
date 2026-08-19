"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// requests
import { sendLoginOtp, verifyLoginOtp } from "@/requests/login";
// hooks
import { useCountdown, usePostLoginRedirect, useAnnounce } from "@/hooks";
// stores
import { useAuthStore } from "@/stores";
// others
import CONSTANTS from "@/constants";

const { RESEND_COUNTDOWN } = CONSTANTS.LOGIN;

export const useOtpLogin = ({
  email,
  onVerifyError,
  resendSuccessMessage
}: {
  email: string;
  onVerifyError: () => void;
  resendSuccessMessage: string;
}) => {
  const redirectAfterLogin = usePostLoginRedirect();
  const setTokens = useAuthStore((state) => state.setTokens);
  const tAnnounce = useTranslations("login.announce");
  const { announce } = useAnnounce();
  const {
    seconds: countdown,
    isFinished: canResend,
    reset: resetCountdown
  } = useCountdown(RESEND_COUNTDOWN);

  const { mutate: sendOtp, isPending: isSending } = useMutation({
    mutationFn: () => sendLoginOtp(email),
    onMutate: () => {
      announce(tAnnounce("sendingCode"));
    },
    onSuccess: () => {
      announce(tAnnounce("codeSent"));
      toast.success(resendSuccessMessage);
      resetCountdown();
    }
  });

  const { mutate: verifyOtp, isPending: isVerifying } = useMutation({
    mutationFn: (otp: string) => verifyLoginOtp(email, otp),
    onMutate: () => {
      announce(tAnnounce("verifying"));
    },
    onSuccess: (tokens) => {
      setTokens(tokens);
      redirectAfterLogin();
    },
    onError: onVerifyError
  });

  return {
    sendOtp,
    verifyOtp,
    isSending,
    isVerifying,
    countdown,
    canResend
  };
};
