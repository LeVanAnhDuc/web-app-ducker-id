"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
import type { EntitlementMatrixFormValues } from "@/types/AdminEntitlements";
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
  const { data: grantsByUser = {}, isLoading: isGrantsLoading } =
    useUserGrants(userIds);
  const updateMutation = useUpdateUserGrants();

  const buildDefaults = () =>
    buildEntitlementDefaults(selectedUsers, apps, grantsByUser);

  const handleEdit = () => {
    form.reset(buildDefaults());
    onEditingChange(true);
  };

  const handleCancel = () => {
    form.reset(buildDefaults());
    onEditingChange(false);
    announce(tAnnounce("canceled"));
  };

  const handleSave = (values: EntitlementMatrixFormValues) => {
    const changes = diffEntitlementGrants(values, buildDefaults());
    if (changes.length === 0) return;
    updateMutation.mutate(changes, {
      onSuccess: () => {
        onEditingChange(false);
        announce(tAnnounce("saved"));
      }
    });
  };

  const handleCheckAllToggle = (
    user: AdminUser,
    eligibleAppIds: string[],
    nextGranted: boolean
  ) => {
    eligibleAppIds.forEach((appId) => {
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
        grantsByUser={grantsByUser}
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
          grantsByUser={grantsByUser}
          onCheckAllToggle={handleCheckAllToggle}
        />
      </form>
    </FormProvider>
  );
};

export default AdminEntitlementsMatrix;
