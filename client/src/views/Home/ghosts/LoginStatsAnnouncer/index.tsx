"use client";

// libs
import { useEffect } from "react";
import { useTranslations } from "next-intl";
// hooks
import { useAnnounce } from "@/hooks";

const LoginStatsAnnouncer = ({
  isLoading,
  total
}: {
  isLoading: boolean;
  total?: number;
}) => {
  const tAnnounce = useTranslations("home.loginStats.announce");
  const { announce } = useAnnounce();

  useEffect(() => {
    if (isLoading) announce(tAnnounce("loading"));
  }, [isLoading, announce, tAnnounce]);

  useEffect(() => {
    if (typeof total === "number") {
      announce(tAnnounce("loaded", { total }));
    }
  }, [total, announce, tAnnounce]);

  return null;
};

export default LoginStatsAnnouncer;
