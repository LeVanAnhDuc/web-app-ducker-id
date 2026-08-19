"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// requests
import { completeSignup } from "@/requests/signup";
// hooks
import { useAnnounce } from "@/hooks";
// stores
import { useAuthStore } from "@/stores";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { HOME } = CONSTANTS.ROUTES;

export const useSignupComplete = () => {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const tAnnounce = useTranslations("signup.announce");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: completeSignup,
    onMutate: () => {
      announce(tAnnounce("completing"));
    },
    onSuccess: ({ tokens }) => {
      announce(tAnnounce("completed"));
      setTokens(tokens);
      router.push(HOME);
    }
  });
};
