"use client";

// libs
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import PageTitle from "@/components/PageTitle";

const AdminAppsHeader = ({ onCreate }: { onCreate: () => void }) => {
  const t = useTranslations("adminApps");
  const tActions = useTranslations("adminApps.actions");
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <PageTitle>{t("title")}</PageTitle>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <CustomButton onClick={onCreate} iconLeft={<Plus aria-hidden="true" />}>
        {tActions("create")}
      </CustomButton>
    </div>
  );
};

export default AdminAppsHeader;
