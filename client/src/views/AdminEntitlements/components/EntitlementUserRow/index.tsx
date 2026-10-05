"use client";

// libs
import { useFormContext, useWatch } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type { WebApp } from "@/types/AdminApps";
import type {
  EntitlementMatrixFormValues,
  UserAccess
} from "@/types/AdminEntitlements";
// components
import { TableCell, TableRow } from "@/components/ui/table";
import CustomButton from "@/components/CustomButton";
import EntitlementCell from "../EntitlementCell";
// others
import { cn } from "@/libs/utils";
import { isRoleDefaultGranted } from "@/utils";

const STICKY_USER_CELL_CLASS =
  "bg-card sticky left-0 z-10 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]";

const EntitlementUserRow = ({
  user,
  apps,
  isEditing,
  access,
  onCheckAllToggle
}: {
  user: AdminUser;
  apps: WebApp[];
  isEditing: boolean;
  access: UserAccess | undefined;
  onCheckAllToggle: (
    user: AdminUser,
    appIds: string[],
    nextGranted: boolean
  ) => void;
}) => {
  const t = useTranslations("adminEntitlements.matrix");
  const { control } = useFormContext<EntitlementMatrixFormValues>();
  const rowValues = useWatch({
    control,
    name: `grants.${user._id}` as FieldPath<EntitlementMatrixFormValues>
  }) as Record<string, boolean> | undefined;

  const appIds = apps.map((app) => app._id);
  const allChecked = appIds.every((appId) => Boolean(rowValues?.[appId]));

  const handleCheckAllToggle = () => {
    onCheckAllToggle(user, appIds, !allChecked);
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
              aria-label={t(allChecked ? "uncheckAll" : "checkAll")}
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
            granted={access?.grantedAppIds.includes(app._id) ?? false}
            roleDefault={isRoleDefaultGranted(access, app._id)}
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
