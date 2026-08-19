"use client";

// libs
import { useFormContext, useWatch } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type { WebApp } from "@/types/AdminApps";
import type { EntitlementMatrixFormValues } from "@/types/AdminEntitlements";
// components
import { TableCell, TableRow } from "@/components/ui/table";
import CustomButton from "@/components/CustomButton";
import EntitlementCell from "../EntitlementCell";
// others
import { cn } from "@/libs/utils";
import { isAppEligibleForUser } from "@/utils";

const STICKY_USER_CELL_CLASS =
  "bg-card sticky left-0 z-10 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]";

const EntitlementUserRow = ({
  user,
  apps,
  isEditing,
  grantedAppIds,
  onCheckAllToggle
}: {
  user: AdminUser;
  apps: WebApp[];
  isEditing: boolean;
  grantedAppIds: string[];
  onCheckAllToggle: (
    user: AdminUser,
    eligibleAppIds: string[],
    nextGranted: boolean
  ) => void;
}) => {
  const t = useTranslations("adminEntitlements.matrix");
  const { control } = useFormContext<EntitlementMatrixFormValues>();
  const rowValues = useWatch({
    control,
    name: `grants.${user._id}` as FieldPath<EntitlementMatrixFormValues>
  }) as Record<string, boolean> | undefined;

  const eligibleAppIds = apps
    .filter((app) => isAppEligibleForUser(user, app))
    .map((app) => app._id);
  const hasEligibleApps = eligibleAppIds.length > 0;
  const allEligibleChecked =
    hasEligibleApps &&
    eligibleAppIds.every((appId) => Boolean(rowValues?.[appId]));

  const handleCheckAllToggle = () => {
    onCheckAllToggle(user, eligibleAppIds, !allEligibleChecked);
  };

  return (
    <TableRow>
      <th
        scope="row"
        className={cn(
          "p-4 text-left align-middle font-normal",
          STICKY_USER_CELL_CLASS
        )}
      >
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold">
            {user.fullName.charAt(0).toUpperCase()}
          </span>
          <div className="flex flex-col text-left">
            <span className="text-foreground text-sm font-semibold">
              {user.fullName}
            </span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
          {isEditing && (
            <CustomButton
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              disabled={!hasEligibleApps}
              aria-label={t(allEligibleChecked ? "uncheckAll" : "checkAll")}
              onClick={handleCheckAllToggle}
            >
              <CheckCheck className="size-4" aria-hidden="true" />
            </CustomButton>
          )}
        </div>
      </th>
      {apps.map((app) => (
        <TableCell key={app._id} className="text-center">
          <EntitlementCell
            isEditing={isEditing}
            granted={grantedAppIds.includes(app._id)}
            eligible={isAppEligibleForUser(user, app)}
            fieldName={`grants.${user._id}.${app._id}`}
            appName={app.displayName}
            userName={user.fullName}
          />
        </TableCell>
      ))}
    </TableRow>
  );
};

export default EntitlementUserRow;
