"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// types
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// hooks
import useAnnounce from "./useAnnounce";
// stores
import { useAuthStore } from "@/stores";
// requests
import { changePassword } from "@/requests/changePassword";

const useChangePassword = () => {
  const setTokens = useAuthStore((state) => state.setTokens);
  const t = useTranslations("account.changePassword");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: (payload: ChangePasswordFormValues) => changePassword(payload),
    onMutate: () => {
      announce(t("announce.saving"));
    },
    onSuccess: (tokens) => {
      // Keep the current device signed in with freshly issued tokens.
      setTokens(tokens);
      announce(t("announce.saved"));
      toast.success(t("toast.success"));
    }
  });
};

export default useChangePassword;
