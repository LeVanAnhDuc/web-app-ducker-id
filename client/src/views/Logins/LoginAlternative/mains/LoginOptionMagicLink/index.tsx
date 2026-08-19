"use client";

// libs
import { Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// components
import LoginOptionCardButton from "../../components/LoginOptionCardButton";
// hooks
import { useAnnounce } from "@/hooks";
// requests
import { sendLoginMagicLink } from "@/requests/login";
// others
import CONSTANTS from "@/constants";

const { LOGIN_MAGIC_LINK } = CONSTANTS.ROUTES;

const LoginOptionMagicLink = ({
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

  const { mutate: sendMagicLink } = useMutation({
    mutationFn: () => sendLoginMagicLink(email),
    onMutate: () => announce(tAnnounce("sendingLink")),
    onSuccess: () => announce(tAnnounce("linkSent")),
    onError: () => announce(tAnnounce("linkSendError"))
  });

  return (
    <LoginOptionCardButton
      icon={Mail}
      title={title}
      description={description}
      colorVariant="primary"
      href={`${LOGIN_MAGIC_LINK}?email=${encodeURIComponent(email)}`}
      animationDelay={delay}
      onSelect={() => sendMagicLink()}
    />
  );
};

export default LoginOptionMagicLink;
