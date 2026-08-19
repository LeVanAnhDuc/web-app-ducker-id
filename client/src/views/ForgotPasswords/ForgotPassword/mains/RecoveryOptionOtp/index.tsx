"use client";

// libs
import { Smartphone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// components
import RecoveryOptionCardButton from "../../components/RecoveryOptionCardButton";
// hooks
import { useAnnounce } from "@/hooks";
// requests
import { sendForgotPasswordOtp } from "@/requests/forgotPassword";
// others
import CONSTANTS from "@/constants";

const { FORGOT_PASSWORD_OTP } = CONSTANTS.ROUTES;

const RecoveryOptionOtp = ({
  email,
  title,
  description,
  delay
}: {
  email: string;
  title: string;
  description: string;
  delay?: number;
}) => {
  const tAnnounce = useTranslations("forgotPassword.announce");
  const { announce } = useAnnounce();

  const { mutate: sendOtp } = useMutation({
    mutationFn: () => sendForgotPasswordOtp(email),
    onMutate: () => announce(tAnnounce("sendingCode")),
    onSuccess: () => announce(tAnnounce("codeSent")),
    onError: () => announce(tAnnounce("codeSendError"))
  });

  return (
    <RecoveryOptionCardButton
      icon={Smartphone}
      title={title}
      description={description}
      colorVariant="info"
      href={`${FORGOT_PASSWORD_OTP}?email=${encodeURIComponent(email)}`}
      animationDelay={delay}
      onSelect={() => sendOtp()}
    />
  );
};

export default RecoveryOptionOtp;
