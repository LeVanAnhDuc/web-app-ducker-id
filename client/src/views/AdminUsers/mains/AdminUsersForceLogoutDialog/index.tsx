"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminUser } from "@/types/AdminUsers";
// components
import CustomButton from "@/components/CustomButton";
import CustomDialogContent from "@/components/CustomDialogContent";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
// hooks
import { useAnnounce } from "@/hooks";
import useForceLogoutAdminUser from "../../hooks/useForceLogoutAdminUser";

const AdminUsersForceLogoutDialog = ({
  target,
  onClose
}: {
  target: AdminUser | null;
  onClose: () => void;
}) => {
  const t = useTranslations("adminUsers.forceLogoutDialog");
  const tActions = useTranslations("adminUsers.actions");
  const tAnnounce = useTranslations("adminUsers.announce");
  const { announce } = useAnnounce();
  const mutation = useForceLogoutAdminUser();

  const handleConfirm = () => {
    if (!target) return;
    mutation.mutate(target._id, {
      onSuccess: () => {
        announce(tAnnounce("forceLoggedOut", { name: target.fullName }));
        onClose();
      }
    });
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <CustomDialogContent>
        <DialogHeader>
          <DialogTitle>
            {target
              ? t("title", { name: target.fullName })
              : t("title", { name: "" })}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <CustomButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {tActions("cancel")}
          </CustomButton>
          <CustomButton
            type="button"
            variant="destructive"
            loading={mutation.isPending}
            onClick={handleConfirm}
          >
            {tActions("confirmForceLogout")}
          </CustomButton>
        </DialogFooter>
      </CustomDialogContent>
    </Dialog>
  );
};

export default AdminUsersForceLogoutDialog;
