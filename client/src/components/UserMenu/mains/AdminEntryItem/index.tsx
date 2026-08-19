"use client";

// libs
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import UserMenuItem from "../../components/UserMenuItem";
// hooks
import { useUserInfo } from "@/hooks";
// others
import CONSTANTS from "@/constants";

const AdminEntryItem = () => {
  const t = useTranslations("common.userMenu");
  const userInfo = useUserInfo();

  if (userInfo?.roles !== CONSTANTS.AUTHENTICATION_ROLES.ADMIN) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <UserMenuItem
        icon={Shield}
        label={t("adminConsole")}
        href={CONSTANTS.ROUTES.ADMIN_DASHBOARD}
      />
    </>
  );
};

export default AdminEntryItem;
