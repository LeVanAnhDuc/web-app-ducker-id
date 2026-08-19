"use client";

// libs
import { useEffect } from "react";
// hooks
import { useUserInfo } from "@/hooks";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { HOME } = CONSTANTS.ROUTES;

const ForceChangeGuard = () => {
  const router = useRouter();
  const userInfo = useUserInfo();

  const shouldRedirectHome = userInfo?.mustChangePassword === false;

  useEffect(() => {
    if (shouldRedirectHome) router.replace(HOME);
  }, [shouldRedirectHome, router]);

  return null;
};

export default ForceChangeGuard;
