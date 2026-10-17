"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// requests
import { requestUnlock } from "@/requests/unlockAccount";
// hooks
import { useAnnounce } from "@/hooks";

export const useUnlockRequest = () => {
  const tAnnounce = useTranslations("login.announce");
  const { announce } = useAnnounce();

  return useMutation({
    mutationFn: (email: string) => requestUnlock(email),
    onMutate: () => announce(tAnnounce("unlockSending")),
    onSuccess: () => announce(tAnnounce("unlockSent"))
  });
};
