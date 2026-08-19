"use client";

// libs
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import ShortId from "@/components/ShortId";

const SupportSuccess = ({
  id,
  onSubmitAnother,
  onClose
}: {
  id: string;
  onSubmitAnother: () => void;
  onClose: () => void;
}) => {
  const t = useTranslations("support.success");
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-success/10 text-success flex size-14 items-center justify-center rounded-full">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <div className="bg-muted/50 space-y-1 rounded-lg px-4 py-3 text-center">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {t("ticketLabel")}
        </p>
        <p className="text-base font-semibold">
          <ShortId value={id} />
        </p>
        <p className="text-muted-foreground text-xs">{t("saveTicketNote")}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <CustomButton variant="outline" onClick={onSubmitAnother}>
          {t("button.submitAnother")}
        </CustomButton>
        <CustomButton onClick={onClose}>{t("button.close")}</CustomButton>
      </div>
    </div>
  );
};

export default SupportSuccess;
