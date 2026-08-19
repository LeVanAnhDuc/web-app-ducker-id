"use client";

// libs
import { useTranslations } from "next-intl";
// hooks
import { useAnnounce, useUpdateEffect } from "@/hooks";

const PickerResultsAnnouncer = ({
  count,
  isOpen,
  isFetching
}: {
  count: number;
  isOpen: boolean;
  isFetching: boolean;
}) => {
  const t = useTranslations("adminEntitlements.announce");
  const { announce } = useAnnounce();

  useUpdateEffect(() => {
    if (isOpen && !isFetching) announce(t("results", { count }));
  }, [count, isOpen, isFetching]);

  return null;
};

export default PickerResultsAnnouncer;
