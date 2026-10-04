"use client";
// libs
import { useTranslations } from "next-intl";

const AllLoadedNote = () => {
  const t = useTranslations("recentlyUsed");
  return (
    <p className="text-muted-foreground text-center text-xs">
      {t("allLoaded")}
    </p>
  );
};

export default AllLoadedNote;
