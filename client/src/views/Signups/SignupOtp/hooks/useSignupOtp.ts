"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// requests
import { verifySignupOtp, resendSignupOtp } from "@/requests/signup";
// hooks
import { useCountdown, useAnnounce } from "@/hooks";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { SIGNUP_INFO } = CONSTANTS.ROUTES;
const { RESEND_COUNTDOWN } = CONSTANTS.SIGNUP;

export const useSignupOtp = ({
  email,
  onVerifyError,
  resendSuccessMessage
}: {
  email: string;
  onVerifyError: () => void;
  resendSuccessMessage: string;
}) => {
  const router = useRouter();
  const tAnnounce = useTranslations("signup.announce");
  const { announce } = useAnnounce();
  const {
    seconds: countdown,
    isFinished: canResend,
    reset: resetCountdown
  } = useCountdown(RESEND_COUNTDOWN);

  const { mutate: verifyOtp, isPending: isVerifying } = useMutation({
    mutationFn: (otp: string) => verifySignupOtp(email, otp),
    onMutate: () => {
      announce(tAnnounce("verifying"));
    },
    onSuccess: ({ sessionToken }) => {
      announce(tAnnounce("verified"));
      router.push(
        `${SIGNUP_INFO}?sessionToken=${sessionToken}&email=${encodeURIComponent(email)}`
      );
    },
    onError: onVerifyError
  });

  const { mutate: resendOtp, isPending: isResending } = useMutation({
    mutationFn: () => resendSignupOtp(email),
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
