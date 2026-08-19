"use client";

// libs
import { Smartphone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// components
import LoginOptionCardButton from "../../components/LoginOptionCardButton";
// hooks
import { useAnnounce } from "@/hooks";
// requests
import { sendLoginOtp } from "@/requests/login";
// others
import CONSTANTS from "@/constants";

const { LOGIN_OTP } = CONSTANTS.ROUTES;

const LoginOptionOtp = ({
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
  const tAnnounce = useTranslations("login.announce");
  const { announce } = useAnnounce();

  const { mutate: sendOtp } = useMutation({
    mutationFn: () => sendLoginOtp(email),
    onMutate: () => announce(tAnnounce("sendingCode")),
    onSuccess: () => announce(tAnnounce("codeSent")),
    onError: () => announce(tAnnounce("codeSendError"))
  });

  return (
    <LoginOptionCardButton
      icon={Smartphone}
      title={title}
      description={description}
      colorVariant="info"
      href={`${LOGIN_OTP}?email=${encodeURIComponent(email)}`}
      animationDelay={delay}
      onSelect={() => sendOtp()}
    />
  );
};

export default LoginOptionOtp;
