"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// requests
import {
  verifyForgotPasswordOtp,
  sendForgotPasswordOtp
} from "@/requests/forgotPassword";
// hooks
import { useCountdown, useAnnounce } from "@/hooks";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { FORGOT_PASSWORD_RESET } = CONSTANTS.ROUTES;
const { RESEND_COUNTDOWN } = CONSTANTS.FORGOT_PASSWORD;

export const useForgotPasswordOtp = ({
  email,
  onVerifyError,
  resendSuccessMessage
}: {
  email: string;
  onVerifyError: () => void;
  resendSuccessMessage: string;
}) => {
  const router = useRouter();
  const tAnnounce = useTranslations("forgotPassword.announce");
  const { announce } = useAnnounce();
  const {
    seconds: countdown,
    isFinished: canResend,
    reset: resetCountdown
  } = useCountdown(RESEND_COUNTDOWN);

  const { mutate: verifyOtp, isPending: isVerifying } = useMutation({
    mutationFn: (otp: string) => verifyForgotPasswordOtp(email, otp),
    onMutate: () => {
      announce(tAnnounce("verifying"));
    },
    onSuccess: ({ resetToken }) => {
      announce(tAnnounce("verified"));
      router.push(
        `${FORGOT_PASSWORD_RESET}?email=${encodeURIComponent(email)}&token=${resetToken}`
      );
    },
    onError: onVerifyError
  });

  const { mutate: resendOtp, isPending: isResending } = useMutation({
    mutationFn: () => sendForgotPasswordOtp(email),
    onMutate: () => {
      announce(tAnnounce("sendingCode"));
    },
    onSuccess: () => {
      announce(tAnnounce("codeSent"));
      toast.success(resendSuccessMessage);
      resetCountdown();
    }
  });

  return {
    verifyOtp,
    resendOtp,
    isVerifying,
    isResending,
    countdown,
    canResend
  };
};
