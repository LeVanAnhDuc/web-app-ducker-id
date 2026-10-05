"use client";

// libs
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type { WebApp } from "@/types/AdminApps";
import type {
  EntitlementMatrixFormValues,
  UserAccess
} from "@/types/AdminEntitlements";
// others
import { buildEntitlementDefaults } from "@/utils";

const MatrixFormSyncEffect = ({
  users,
  apps,
  accessByUser,
  isEditing
}: {
  users: AdminUser[];
  apps: WebApp[];
  accessByUser: Record<string, UserAccess>;
  isEditing: boolean;
}) => {
  const { reset } = useFormContext<EntitlementMatrixFormValues>();

  useEffect(() => {
    if (isEditing) return;
    reset(buildEntitlementDefaults(users, apps, accessByUser));
  }, [users, apps, accessByUser, isEditing, reset]);

  return null;
};

export default MatrixFormSyncEffect;
