"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AuthenticationRole } from "@/types/User";
// components
import CustomBadge from "@/components/CustomBadge";

const RoleChip = ({ role }: { role: AuthenticationRole }) => {
  const t = useTranslations("adminApps.roles");
  return (
    <CustomBadge variant="outline" className="text-xs">
      {t(role)}
    </CustomBadge>
  );
};

export default RoleChip;
