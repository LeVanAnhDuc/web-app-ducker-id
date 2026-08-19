"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
// components
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import UserMultiSelect from "../../components/UserMultiSelect";
import SelectedUserChips from "../../components/SelectedUserChips";
import UserNotSelectedEmpty from "../../components/UserNotSelectedEmpty";
import AdminEntitlementsMatrix from "../AdminEntitlementsMatrix";
// hooks
import { useAnnounce } from "@/hooks";

const AdminEntitlementsBoard = () => {
  const t = useTranslations("adminEntitlements");
  const tAnnounce = useTranslations("adminEntitlements.announce");
  const { announce } = useAnnounce();

  const [selectedUsers, setSelectedUsers] = useState<AdminUser[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const removeUser = (user: AdminUser) => {
    setSelectedUsers((prev) => prev.filter((item) => item._id !== user._id));
    announce(tAnnounce("deselected", { name: user.fullName }));
  };

  const toggleUser = (user: AdminUser) => {
    const isSelected = selectedUsers.some((item) => item._id === user._id);
    if (isSelected) {
      removeUser(user);
      return;
    }
    setSelectedUsers((prev) => [...prev, user]);
    announce(tAnnounce("selected", { name: user.fullName }));
  };

  return (
    <PageShell fullHeight>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <UserMultiSelect
        selectedUsers={selectedUsers}
        onToggle={toggleUser}
        disabled={isEditing}
      />
      <SelectedUserChips
        users={selectedUsers}
        onRemove={removeUser}
        disabled={isEditing}
      />
      <div>
        {selectedUsers.length === 0 ? (
          <UserNotSelectedEmpty />
        ) : (
          <AdminEntitlementsMatrix
            selectedUsers={selectedUsers}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
          />
        )}
      </div>
    </PageShell>
  );
};

export default AdminEntitlementsBoard;
