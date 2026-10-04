"use client";

// libs
import { useTranslations } from "next-intl";
// components
import { Spinner } from "@/components/ui/spinner";
// others
import { readAuthRequestAppName } from "@/utils";

const RedirectingScreen = () => {
  const t = useTranslations("common.redirecting");
  const appName =
    typeof window === "undefined" ? null : readAuthRequestAppName();

  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <p className="text-muted-foreground text-sm">
        {appName ? t("toApp", { app: appName }) : t("generic")}
      </p>
    </div>
  );
};

export default RedirectingScreen;
