"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { WebAppCategory } from "@/types/AdminApps";
// components
import NameInput from "../NameInput";
import DisplayNameInput from "../DisplayNameInput";
import DescriptionTextarea from "../DescriptionTextarea";
import HomeUrlInput from "../HomeUrlInput";
import IconUrlInput from "../IconUrlInput";
import CategorySelect from "../CategorySelect";
import StatusSwitch from "../StatusSwitch";
import RequiredRolesGroup from "../RequiredRolesGroup";
import RedirectUrisField from "../RedirectUrisField";

const AppFormFields = ({
  categories,
  disabled = false
}: {
  categories: WebAppCategory[];
  disabled?: boolean;
}) => {
  const t = useTranslations("adminApps.form.fields");

  return (
    <div className="space-y-5">
      <NameInput
        label={t("name.label")}
        placeholder={t("name.placeholder")}
        hint={t("name.hint")}
        disabled={disabled}
      />
      <DisplayNameInput
        label={t("displayName.label")}
        placeholder={t("displayName.placeholder")}
        hint={t("displayName.hint")}
        disabled={disabled}
      />
      <DescriptionTextarea
        label={t("description.label")}
        placeholder={t("description.placeholder")}
        disabled={disabled}
      />
      <HomeUrlInput
        label={t("homeUrl.label")}
        placeholder={t("homeUrl.placeholder")}
        hint={t("homeUrl.hint")}
        disabled={disabled}
      />
      <IconUrlInput
        label={t("iconUrl.label")}
        placeholder={t("iconUrl.placeholder")}
        disabled={disabled}
      />
      <CategorySelect
        label={t("categoryId.label")}
        placeholder={t("categoryId.placeholder")}
        categories={categories}
        disabled={disabled}
      />
      <StatusSwitch label={t("status.label")} disabled={disabled} />
      <RequiredRolesGroup
        label={t("requiredRoles.label")}
        hint={t("requiredRoles.hint")}
        disabled={disabled}
      />
      <RedirectUrisField
        label={t("redirectUris.label")}
        placeholder={t("redirectUris.placeholder")}
        hint={t("redirectUris.hint")}
        disabled={disabled}
      />
    </div>
  );
};

export default AppFormFields;
