"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// components
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import CustomDialogContent from "@/components/CustomDialogContent";
import SupportForm from "./mains/SupportForm";
import SupportSuccess from "./mains/SupportSuccess";
// hooks
import { useUserInfo } from "@/hooks";

type Mode = "form" | "success";

const SupportDialog = ({
  open,
  onOpenChange,
  initialEmail,
  onSubmitted
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  onSubmitted?: (id: string) => void;
}) => {
  const t = useTranslations("support.dialog");
  const userInfo = useUserInfo();
  const [mode, setMode] = useState<Mode>("form");
  const [id, setId] = useState<string | null>(null);

  const isLoggedIn = userInfo !== null;
  const resolvedEmail = isLoggedIn ? userInfo.email : (initialEmail ?? "");
  const emailReadOnly = isLoggedIn;
  const emailPrefilled = !isLoggedIn && Boolean(initialEmail);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMode("form");
      setId(null);
    }
    onOpenChange(next);
  };

  const handleSubmitted = (nextId: string) => {
    setId(nextId);
    setMode("success");
    onSubmitted?.(nextId);
  };

  const handleSubmitAnother = () => {
    setId(null);
    setMode("form");
  };

  const handleClose = () => handleOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <CustomDialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {mode === "form" ? (
          <SupportForm
            initialEmail={resolvedEmail}
            emailReadOnly={emailReadOnly}
            emailPrefilled={emailPrefilled}
            onSubmitted={handleSubmitted}
          />
        ) : (
          <SupportSuccess
            id={id ?? ""}
            onSubmitAnother={handleSubmitAnother}
            onClose={handleClose}
          />
        )}
      </CustomDialogContent>
    </Dialog>
  );
};

export default SupportDialog;
