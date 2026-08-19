"use client";

// libs
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

const UserNotSelectedEmpty = () => {
  const t = useTranslations("adminEntitlements.emptyUser");
  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <Users className="text-muted-foreground size-8" aria-hidden="true" />
        <p className="text-foreground text-sm font-medium">{t("title")}</p>
        <p className="text-muted-foreground max-w-xs text-xs">
          {t("description")}
        </p>
      </div>
    </div>
  );
};

export default UserNotSelectedEmpty;
