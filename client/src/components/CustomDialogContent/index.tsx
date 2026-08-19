"use client";

// libs
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { ComponentProps } from "react";
// components
import { DialogClose, DialogContent } from "@/components/ui/dialog";

const CustomDialogContent = ({
  children,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, "showCloseButton">) => {
  const t = useTranslations("common");

  return (
    <DialogContent {...props} showCloseButton={false}>
      {children}
      <DialogClose
        data-slot="dialog-close"
        className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <XIcon />
        <span className="sr-only">{t("close")}</span>
      </DialogClose>
    </DialogContent>
  );
};

export default CustomDialogContent;
