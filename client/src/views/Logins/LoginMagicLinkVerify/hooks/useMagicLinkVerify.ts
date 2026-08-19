"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// requests
import { verifyLoginMagicLink } from "@/requests/login";
// hooks
import { usePostLoginRedirect, useAnnounce } from "@/hooks";
// stores
import { useAuthStore } from "@/stores";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { LOGIN } = CONSTANTS.ROUTES;

export const useMagicLinkVerify = () => {
  const router = useRouter();
  const redirectAfterLogin = usePostLoginRedirect();
  const setTokens = useAuthStore((state) => state.setTokens);
  const tAnnounce = useTranslations("login.announce");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: ({ email, token }: { email: string; token: string }) =>
      verifyLoginMagicLink(email, token),
    onMutate: () => {
      announce(tAnnounce("verifyingLink"));
    },
    onSuccess: (tokens) => {
      setTokens(tokens);
      redirectAfterLogin();
    },
    onError: () => {
      announce(tAnnounce("linkInvalid"));
      router.push(LOGIN);
    }
  });
};
