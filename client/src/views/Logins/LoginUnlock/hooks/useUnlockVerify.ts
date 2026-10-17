"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// requests
import { verifyUnlock } from "@/requests/unlockAccount";
// hooks
import { usePostLoginRedirect, useAnnounce } from "@/hooks";
// stores
import { useAuthStore } from "@/stores";

// Unlocking signs the user in with mustChangePassword set, so the
// force-change gate takes over right after the redirect.
export const useUnlockVerify = () => {
  const redirectAfterLogin = usePostLoginRedirect();
  const setTokens = useAuthStore((state) => state.setTokens);
  const tAnnounce = useTranslations("login.announce");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: ({
      email,
      tempPassword
    }: {
      email: string;
      tempPassword: string;
    }) => verifyUnlock(email, tempPassword),
    onMutate: () => announce(tAnnounce("unlocking")),
    onSuccess: (tokens) => {
      announce(tAnnounce("signedIn"));
      setTokens(tokens);
      redirectAfterLogin();
    }
  });
};
