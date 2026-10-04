"use client";

// libs
import { useTranslations } from "next-intl";
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
import useClearRecentApps from "../../hooks/useClearRecentApps";

const ClearHistoryDialog = ({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const t = useTranslations("recentlyUsed.clearDialog");
  const mutation = useClearRecentApps();

  const handleConfirm = () =>
    mutation.mutate(undefined, { onSuccess: onClose });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <CustomDialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <CustomButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t("cancel")}
          </CustomButton>
          <CustomButton
            type="button"
            variant="destructive"
            loading={mutation.isPending}
            onClick={handleConfirm}
          >
            {t("confirm")}
          </CustomButton>
        </DialogFooter>
      </CustomDialogContent>
    </Dialog>
  );
};

export default ClearHistoryDialog;
