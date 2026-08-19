"use client";

// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";
import { popCallbackUrl } from "@/utils";

const { HOME } = CONSTANTS.ROUTES;

const usePostLoginRedirect = () => {
  const router = useRouter();

  return () => {
    const callbackUrl = popCallbackUrl();
    router.push(callbackUrl ?? HOME);
  };
};

export default usePostLoginRedirect;
