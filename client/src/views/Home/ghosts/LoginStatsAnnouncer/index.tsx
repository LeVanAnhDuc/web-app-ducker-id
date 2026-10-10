"use client";

// libs
import { useEffect } from "react";
import { useTranslations } from "next-intl";
// hooks
import { useAnnounce } from "@/hooks";

/**
 * The activity card redraws itself when the range changes, which a sighted
 * user sees and a screen-reader user would not. This announces the new total
 * so the toggle reports its own result.
 */
const LoginStatsAnnouncer = ({
  isLoading,
  total,
  days
}: {
  isLoading: boolean;
  total?: number;
  days: number;
}) => {
  const tAnnounce = useTranslations("home.activity.announce");
  const { announce } = useAnnounce();

  useEffect(() => {
    if (isLoading) announce(tAnnounce("loading"));
  }, [isLoading, announce, tAnnounce]);

  useEffect(() => {
    if (typeof total === "number") {
      announce(tAnnounce("loaded", { total, days }));
    }
  }, [total, days, announce, tAnnounce]);

  return null;
};

export default LoginStatsAnnouncer;
