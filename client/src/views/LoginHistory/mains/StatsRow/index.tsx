"use client";
// libs
import { Activity, CircleCheck, CircleX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// components
import { Skeleton } from "@/components/ui/skeleton";
import LoginStatCard from "../../components/LoginStatCard";
// ghosts
import StatsAnnouncer from "../../ghosts/StatsAnnouncer";
// requests
import { getMyLoginHistoryStats } from "@/requests/loginHistory";
// others
import CONSTANTS from "@/constants";

const StatsRow = () => {
  const t = useTranslations("loginHistory.stats");
  const { data, isLoading } = useQuery({
    queryKey: [CONSTANTS.QUERY_KEYS.LOGIN_HISTORY, "stats"],
    queryFn: getMyLoginHistoryStats
  });
  return (
    <>
      <StatsAnnouncer isLoading={isLoading} total={data?.total} />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`stats-skeleton-${i}`} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LoginStatCard
            icon={Activity}
            label={t("totalLogins")}
            value={data?.total ?? 0}
            tone="neutral"
          />
          <LoginStatCard
            icon={CircleCheck}
            label={t("successful")}
            value={data?.successful ?? 0}
            tone="success"
          />
          <LoginStatCard
            icon={CircleX}
            label={t("failed")}
            value={data?.failed ?? 0}
            tone="danger"
          />
        </div>
      )}
    </>
  );
};

export default StatsRow;
