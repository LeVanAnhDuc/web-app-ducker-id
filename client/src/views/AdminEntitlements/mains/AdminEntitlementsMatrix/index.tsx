"use client";

// libs
import { useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type {
  EntitlementMatrixFormValues,
  UserAccess
} from "@/types/AdminEntitlements";
// components
import EntitlementMatrixSkeleton from "../../components/EntitlementMatrixSkeleton";
import EntitlementMatrixEmpty from "../../components/EntitlementMatrixEmpty";
import EntitlementMatrixToolbar from "../../components/EntitlementMatrixToolbar";
import EntitlementMatrixTable from "../../components/EntitlementMatrixTable";
// ghosts
import MatrixFormSyncEffect from "../../ghosts/MatrixFormSyncEffect";
import MatrixAnnouncer from "../../ghosts/MatrixAnnouncer";
// hooks
import { useAnnounce } from "@/hooks";
import useAppCatalog from "../../hooks/useAppCatalog";
import useUserGrants from "../../hooks/useUserGrants";
import useUpdateUserGrants from "../../hooks/useUpdateUserGrants";
// others
import { buildEntitlementDefaults, diffEntitlementGrants } from "@/utils";

// Stable fallback: a fresh `{}` each render would re-run MatrixFormSyncEffect.
const EMPTY_ACCESS: Record<string, UserAccess> = {};

const AdminEntitlementsMatrix = ({
  selectedUsers,
  isEditing,
  onEditingChange
}: {
  selectedUsers: AdminUser[];
  isEditing: boolean;
  onEditingChange: (value: boolean) => void;
}) => {
  const tAnnounce = useTranslations("adminEntitlements.announce");
  const { announce } = useAnnounce();

  const form = useForm<EntitlementMatrixFormValues>({
    defaultValues: { grants: {} }
  });

  const userIds = selectedUsers.map((user) => user._id);
  const { data: apps = [], isLoading: isCatalogLoading } = useAppCatalog();
  const { data: accessByUser = EMPTY_ACCESS, isLoading: isGrantsLoading } =
    useUserGrants(userIds);
  const updateMutation = useUpdateUserGrants();

  const buildDefaults = () =>
    buildEntitlementDefaults(selectedUsers, apps, accessByUser);

  const handleEdit = () => {
    form.reset(buildDefaults());
    onEditingChange(true);
  };

  const handleCancel = () => {
    form.reset(buildDefaults());
    onEditingChange(false);
    announce(tAnnounce("canceled"));
  };

  // `isSaving` disables Save only after a re-render; both clicks of a
  // double-click land before it, so the guard has to be synchronous.
  const isSubmittingRef = useRef(false);

  const handleSave = (values: EntitlementMatrixFormValues) => {
    if (isSubmittingRef.current) return;
    const changes = diffEntitlementGrants(values, buildDefaults());
    if (changes.length === 0) return;
    isSubmittingRef.current = true;
    updateMutation.mutate(changes, {
      onSuccess: () => {
        onEditingChange(false);
        announce(tAnnounce("saved"));
      },
      onSettled: () => {
        isSubmittingRef.current = false;
      }
    });
  };

  const handleCheckAllToggle = (
    user: AdminUser,
    appIds: string[],
    nextGranted: boolean
  ) => {
    appIds.forEach((appId) => {
      form.setValue<`grants.${string}.${string}`>(
        `grants.${user._id}.${appId}`,
        nextGranted,
        { shouldDirty: true }
      );
    });
    announce(
      tAnnounce(nextGranted ? "checkAll" : "uncheckAll", {
        name: user.fullName
      })
    );
  };

  if (isCatalogLoading || isGrantsLoading) return <EntitlementMatrixSkeleton />;
  if (apps.length === 0) return <EntitlementMatrixEmpty />;

  return (
    <FormProvider {...form}>
      <MatrixFormSyncEffect
        users={selectedUsers}
        apps={apps}
        accessByUser={accessByUser}
        isEditing={isEditing}
      />
      <MatrixAnnouncer isEditing={isEditing} />
      <form
        onSubmit={form.handleSubmit(handleSave)}
        className="flex flex-col gap-4"
      >
        <EntitlementMatrixToolbar
          isEditing={isEditing}
          isDirty={form.formState.isDirty}
          isSaving={updateMutation.isPending}
          onEdit={handleEdit}
          onCancel={handleCancel}
        />
        <EntitlementMatrixTable
          users={selectedUsers}
          apps={apps}
          isEditing={isEditing}
          accessByUser={accessByUser}
          onCheckAllToggle={handleCheckAllToggle}
        />
      </form>
    </FormProvider>
  );
};

export default AdminEntitlementsMatrix;
