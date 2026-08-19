"use client";

// libs
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import UserMenuItem from "../../components/UserMenuItem";
// hooks
import { useAnnounce } from "@/hooks";
// stores
import { useAuthStore } from "@/stores";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const SignOutItem = () => {
  const router = useRouter();
  const t = useTranslations("common.userMenu");
  const { announce } = useAnnounce();
  const logout = useAuthStore((state) => state.logout);
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    if (isPending) return;
    setIsPending(true);
    announce(t("signingOut"));
    try {
      await logout();
      announce(t("signedOut"));
    } finally {
      setIsPending(false);
      router.push(CONSTANTS.ROUTES.LOGIN);
    }
  };

  return (
    <UserMenuItem
      icon={LogOut}
      label={t("signOut")}
      shortcut={t("signOutHint")}
      variant="destructive"
      onSelect={handleLogout}
    />
  );
};

export default SignOutItem;
