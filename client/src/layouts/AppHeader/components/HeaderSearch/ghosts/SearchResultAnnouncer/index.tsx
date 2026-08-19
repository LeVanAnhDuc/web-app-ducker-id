"use client";

// libs
import { useEffect } from "react";
import { useTranslations } from "next-intl";
// hooks
import { useAnnounce } from "@/hooks";

const SearchResultAnnouncer = ({
  open,
  isLoading,
  itemsLength
}: {
  open: boolean;
  isLoading: boolean;
  itemsLength: number;
}) => {
  const t = useTranslations("dashboard.header");
  const { announce } = useAnnounce();

  useEffect(() => {
    if (!open || isLoading) return;
    if (itemsLength === 0) {
      announce(t("announce.noResults"));
    } else {
      announce(t("announce.results", { count: itemsLength }));
    }
  }, [open, isLoading, itemsLength, announce, t]);

  return null;
};

export default SearchResultAnnouncer;
