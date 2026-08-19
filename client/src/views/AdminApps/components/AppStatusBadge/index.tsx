"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AppStatus } from "@/types/AdminApps";
// components
import CustomBadge from "@/components/CustomBadge";
// others
import CONSTANTS from "@/constants";

const AppStatusBadge = ({ status }: { status: AppStatus }) => {
  const t = useTranslations("adminApps.status");
  return (
    <CustomBadge
      variant={status === CONSTANTS.APP_STATUS.ACTIVE ? "success" : "secondary"}
      className="text-xs"
    >
      {t(status)}
    </CustomBadge>
  );
};

export default AppStatusBadge;
