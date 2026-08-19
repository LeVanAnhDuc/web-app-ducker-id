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
import useLockAdminUser from "../../hooks/useLockAdminUser";
import useUnlockAdminUser from "../../hooks/useUnlockAdminUser";

const AdminUsersLockDialog = ({
  target,
  onClose
}: {
  target: AdminUser | null;
  onClose: () => void;
}) => {
  const t = useTranslations("adminUsers.lockDialog");
  const tActions = useTranslations("adminUsers.actions");
  const tAnnounce = useTranslations("adminUsers.announce");
  const { announce } = useAnnounce();
  const lockMutation = useLockAdminUser();
  const unlockMutation = useUnlockAdminUser();

  const isUnlocking = target ? !target.isActive : false;
  const activeMutation = isUnlocking ? unlockMutation : lockMutation;

  const handleConfirm = () => {
    if (!target) return;
    activeMutation.mutate(target._id, {
      onSuccess: () => {
        announce(
          tAnnounce(isUnlocking ? "unlocked" : "locked", {
            name: target.fullName
          })
        );
        onClose();
      }
    });
  };

  const titleKey = isUnlocking ? "unlockTitle" : "lockTitle";
  const descKey = isUnlocking ? "unlockDescription" : "lockDescription";
  const confirmKey = isUnlocking ? "confirmUnlock" : "confirmLock";

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <CustomDialogContent>
        <DialogHeader>
          <DialogTitle>
            {target
              ? t(titleKey, { name: target.fullName })
              : t(titleKey, { name: "" })}
          </DialogTitle>
          <DialogDescription>{t(descKey)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <CustomButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={activeMutation.isPending}
          >
            {tActions("cancel")}
          </CustomButton>
          <CustomButton
            type="button"
            variant={isUnlocking ? "default" : "destructive"}
            loading={activeMutation.isPending}
            onClick={handleConfirm}
          >
            {tActions(confirmKey)}
          </CustomButton>
        </DialogFooter>
      </CustomDialogContent>
    </Dialog>
  );
};

export default AdminUsersLockDialog;
