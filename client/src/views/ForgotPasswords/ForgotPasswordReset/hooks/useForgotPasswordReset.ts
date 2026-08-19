"use client";

// libs
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// requests
import {
  verifyForgotPasswordMagicLink,
  forgotPasswordReset
} from "@/requests/forgotPassword";
// hooks
import { useAnnounce } from "@/hooks";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;

export const useForgotPasswordReset = ({
  email,
  token,
  method,
  successMessage
}: {
  email: string;
  token: string;
  method?: string;
  successMessage: string;
}) => {
  const router = useRouter();
  const tAnnounce = useTranslations("forgotPassword.announce");
  const { announce } = useAnnounce();
  const isMagicLink = method === CONSTANTS.LOGIN_HISTORY.METHOD.MAGIC_LINK;

  // For OTP flow: token is already the resetToken
  // For magic-link flow: token is the magic link token, need to verify first
  const [resetToken, setResetToken] = useState<string | null>(
    isMagicLink ? null : token
  );
  const [verifyFailed, setVerifyFailed] = useState(false);

  const { mutate: verifyMagicLink, isPending: isVerifying } = useMutation({
    mutationFn: () => verifyForgotPasswordMagicLink(email, token),
    onMutate: () => {
      announce(tAnnounce("verifyingLink"));
    },
    onSuccess: (data) => setResetToken(data.resetToken),
    onError: () => {
      announce(tAnnounce("linkInvalid"));
      setVerifyFailed(true);
    }
  });

  useEffect(() => {
    if (isMagicLink) {
      verifyMagicLink();
    }
  }, []);

  const { mutate: reset, isPending: isResetting } = useMutation({
    mutationFn: (newPassword: string) =>
      forgotPasswordReset(email, resetToken!, newPassword),
    onMutate: () => {
      announce(tAnnounce("resetting"));
    },
    onSuccess: () => {
      toast.success(successMessage);
      router.push(LOGIN);
    }
  });

  return {
    resetToken,
    isVerifying,
    verifyFailed,
    reset,
    isResetting
  };
};
