"use client";

// libs
import { useTranslations } from "next-intl";
// components
import CustomTooltip from "@/components/CustomTooltip";

const OverrideMarker = ({ granted }: { granted: boolean }) => {
  const t = useTranslations("adminEntitlements.cell");
  const label = t(granted ? "overrideGranted" : "overrideRevoked");

  return (
    <CustomTooltip content={label}>
      <span
        role="img"
        aria-label={label}
        className="bg-keyline inline-block size-1.5 rounded-full"
      />
    </CustomTooltip>
  );
};

export default OverrideMarker;
