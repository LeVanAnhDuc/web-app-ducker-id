"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { AdminAppCreateResult } from "@/types/AdminApps";
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
import SecretField from "../../components/SecretField";
// hooks
import { useAnnounce } from "@/hooks";

const AdminAppsSecretDialog = ({
  app,
  onClose
}: {
  app: AdminAppCreateResult | null;
  onClose: () => void;
}) => {
  const t = useTranslations("adminApps.secretDialog");
  const tActions = useTranslations("adminApps.actions");
  const { announce } = useAnnounce();

  return (
    <Dialog open={app !== null} onOpenChange={(o) => !o && onClose()}>
      <CustomDialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {app && (
          <div className="space-y-4">
            <SecretField
              label={t("clientIdLabel")}
              value={app.clientId}
              copyLabel={tActions("copy")}
              copiedLabel={tActions("copied")}
              onCopySuccess={() => announce(t("announce.copied"))}
            />
            <SecretField
              label={t("clientSecretLabel")}
              value={app.clientSecret}
              copyLabel={tActions("copy")}
              copiedLabel={tActions("copied")}
              onCopySuccess={() => announce(t("announce.copied"))}
            />
            <p className="text-destructive text-sm font-medium">
              {t("warning")}
            </p>
          </div>
        )}
        <DialogFooter>
          <CustomButton type="button" onClick={onClose}>
            {t("done")}
          </CustomButton>
        </DialogFooter>
      </CustomDialogContent>
    </Dialog>
  );
};

export default AdminAppsSecretDialog;
