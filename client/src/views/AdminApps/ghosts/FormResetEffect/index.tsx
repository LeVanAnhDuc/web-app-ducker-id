"use client";

// libs
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
// types
import type { AdminAppFormValues, WebApp } from "@/types/AdminApps";
// forms
import { initialAdminAppData } from "@/forms/AdminApp/data";

const toFormValues = (app: WebApp): AdminAppFormValues => ({
  name: app.name,
  displayName: app.displayName,
  description: app.description ?? "",
  iconUrl: app.iconUrl ?? "",
  homeUrl: app.homeUrl,
  categoryIds: app.categoryIds,
  status: app.status,
  requiredRoles: app.requiredRoles,
  redirectUris: app.redirectUris,
  tokenEndpointAuthMethod: app.tokenEndpointAuthMethod
});

const FormResetEffect = ({
  open,
  editingApp
}: {
  open: boolean;
  editingApp: WebApp | null;
}) => {
  const { reset } = useFormContext<AdminAppFormValues>();
  useEffect(() => {
    if (!open) return;
    reset(editingApp ? toFormValues(editingApp) : initialAdminAppData);
  }, [open, editingApp, reset]);
  return null;
};

export default FormResetEffect;
