"use client";

// libs
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

const EntitlementStatusIcon = ({ granted }: { granted: boolean }) => {
  const t = useTranslations("adminEntitlements.cell");

  return (
    <span role="img" aria-label={t(granted ? "granted" : "notGranted")}>
      {granted ? (
        <Check className="text-success size-4" aria-hidden="true" />
      ) : (
        <X className="text-muted-foreground size-4" aria-hidden="true" />
      )}
    </span>
  );
};

export default EntitlementStatusIcon;
