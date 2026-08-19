"use client";

// libs
import { useTranslations } from "next-intl";
// components
import CustomBadge from "@/components/CustomBadge";
// others
import CONSTANTS from "@/constants";

const { ACTIVE, LOCKED } = CONSTANTS.ADMIN_USER_STATUS;

const UserStatusBadge = ({ isActive }: { isActive: boolean }) => {
  const t = useTranslations("adminUsers.status");
  return (
    <CustomBadge
      variant={isActive ? "success" : "destructive"}
      className="text-xs"
    >
      {t(isActive ? ACTIVE : LOCKED)}
    </CustomBadge>
  );
};

export default UserStatusBadge;
