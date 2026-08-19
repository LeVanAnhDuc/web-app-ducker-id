"use client";

// libs
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FileText, Download } from "lucide-react";
// components
import CustomButton from "@/components/CustomButton";
import CustomDialogContent from "@/components/CustomDialogContent";
import CustomImage from "@/components/CustomImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// requests
import { getAdminContactDetail } from "@/requests/contactAdmin";
// others
import CONSTANTS from "@/constants";

const ContactAttachments = ({ id }: { id: string }) => {
  const t = useTranslations("contactAdmin.admin.detail.attachments");
  const tFields = useTranslations("contactAdmin.admin.detail.fields");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: contact } = useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.ADMIN_CONTACT_DETAIL, id],
    queryFn: () => getAdminContactDetail(id)
  });

  const attachments = contact?.attachments ?? [];

  if (attachments.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-foreground mb-4 text-sm font-semibold">
          {tFields("attachments")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-6">
      <h2 className="text-foreground mb-4 text-sm font-semibold">
        {tFields("attachments")} ({attachments.length})
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {attachments.map((att, i) => {
          const isImage = att.mimeType.startsWith("image/");
          return (
            <div
              key={i}
              className="bg-muted/50 group relative rounded-lg border p-3"
            >
              {isImage && att.previewUrl ? (
                <CustomButton
                  type="button"
                  variant="ghost"
                  aria-label={`${t("preview")}: ${att.originalName}`}
                  className="mb-2 h-20 w-full p-0"
                  onClick={() => setPreviewUrl(att.previewUrl)}
                >
                  <CustomImage
                    src={att.previewUrl}
                    alt={att.originalName}
                    width={200}
                    height={80}
                    className="h-20 w-full rounded object-cover"
                  />
                </CustomButton>
              ) : (
                <div className="mb-2 flex h-20 items-center justify-center">
                  <FileText className="text-muted-foreground size-10" />
                </div>
              )}
              <p className="truncate text-xs font-medium">{att.originalName}</p>
              <p className="text-muted-foreground text-xs">
                {(att.size / 1024).toFixed(0)} KB
              </p>
              <Button
                asChild
                variant="link"
                size="sm"
                className="mt-2 h-auto justify-start p-0 text-xs"
              >
                <a
                  href={att.previewUrl ?? undefined}
                  download={att.originalName}
                  aria-label={`${t("download")}: ${att.originalName}`}
                >
                  <Download className="size-3" aria-hidden="true" />
                  {t("download")}
                </a>
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog
        open={previewUrl !== null}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <CustomDialogContent className="max-h-[90vh] w-auto max-w-[90vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[90vw]">
          <DialogTitle className="sr-only">
            {tFields("attachments")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("closePreview")}
          </DialogDescription>
          {previewUrl && (
            <CustomImage
              src={previewUrl}
              alt={tFields("attachments")}
              width={1920}
              height={1080}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          )}
        </CustomDialogContent>
      </Dialog>
    </div>
  );
};

export default ContactAttachments;
