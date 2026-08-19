"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AuthenticationRole } from "@/types/User";
// components
import CustomBadge from "@/components/CustomBadge";

const UserRoleBadge = ({ role }: { role: AuthenticationRole }) => {
  const t = useTranslations("adminUsers.role");
  return (
    <CustomBadge
      variant={role === "admin" ? "info" : "outline"}
      className="text-xs"
    >
      {t(role)}
    </CustomBadge>
  );
};

export default UserRoleBadge;
