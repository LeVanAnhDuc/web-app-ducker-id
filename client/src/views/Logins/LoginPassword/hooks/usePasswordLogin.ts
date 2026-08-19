"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// requests
import { loginWithPassword } from "@/requests/login";
// hooks
import { usePostLoginRedirect, useAnnounce } from "@/hooks";
// stores
import { useAuthStore } from "@/stores";

export const usePasswordLogin = () => {
  const redirectAfterLogin = usePostLoginRedirect();
  const setTokens = useAuthStore((state) => state.setTokens);
  const tAnnounce = useTranslations("login.announce");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginWithPassword(email, password),
    onMutate: () => {
      announce(tAnnounce("signingIn"));
    },
    onSuccess: (tokens) => {
      announce(tAnnounce("signedIn"));
      setTokens(tokens);
      redirectAfterLogin();
    }
  });
};
