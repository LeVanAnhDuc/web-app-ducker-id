"use client";

// libs
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type { WebApp } from "@/types/AdminApps";
import type { EntitlementMatrixFormValues } from "@/types/AdminEntitlements";
// others
import { buildEntitlementDefaults } from "@/utils";

const MatrixFormSyncEffect = ({
  users,
  apps,
  grantsByUser,
  isEditing
}: {
  users: AdminUser[];
  apps: WebApp[];
  grantsByUser: Record<string, string[]>;
  isEditing: boolean;
}) => {
  const { reset } = useFormContext<EntitlementMatrixFormValues>();

  useEffect(() => {
    if (isEditing) return;
    reset(buildEntitlementDefaults(users, apps, grantsByUser));
  }, [users, apps, grantsByUser, isEditing, reset]);

  return null;
};

export default MatrixFormSyncEffect;
