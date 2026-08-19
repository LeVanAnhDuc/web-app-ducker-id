"use client";

// libs
import { useEffect } from "react";
import { useTranslations } from "next-intl";
// hooks
import { useAnnounce, useUserInfo } from "@/hooks";
// others
import { useRouter, usePathname } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const { FORCE_CHANGE_PASSWORD } = CONSTANTS.ROUTES;

const MustChangePasswordGate = () => {
  const router = useRouter();
  const pathname = usePathname();
  const userInfo = useUserInfo();
  const t = useTranslations("forceChangePassword.announce");
  const { announce } = useAnnounce();

  const shouldRedirect =
    userInfo?.mustChangePassword === true && pathname !== FORCE_CHANGE_PASSWORD;

  useEffect(() => {
    if (!shouldRedirect) return;
    announce(t("redirected"));
    router.replace(FORCE_CHANGE_PASSWORD);
  }, [shouldRedirect, router, announce, t]);

  return null;
};

export default MustChangePasswordGate;
