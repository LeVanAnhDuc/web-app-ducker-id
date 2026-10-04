"use client";

// types
import type { LoginHistoryStats } from "@/types/LoginHistory";
import type { RecentAppsStats } from "@/types/RecentlyUsed";
// libs
import { useTranslations } from "next-intl";
// components
import StatCard from "../../components/StatCard";
// dataSources
import { buildHomeStatCards } from "@/dataSources/Home";

/**
 * Four numbers, each one a link. The pair on the right carry the range in
 * their hint: the default window is seven days, and a count without its
 * window reads as "all time" and looks like data went missing.
 */
const StatsSection = ({
  appStats,
  loginStats,
  isLoading
}: {
  appStats?: RecentAppsStats;
  loginStats?: LoginHistoryStats;
  isLoading: boolean;
}) => {
  const t = useTranslations("home.stats");
  const cards = buildHomeStatCards(appStats, loginStats);
  const days = loginStats?.range.days ?? 0;
  const anomalies = loginStats?.anomalies ?? 0;

  const hintFor = (key: string): string => {
    if (key === "totalApps") return t("allTime");
    if (key === "activeApps") return t("stillOpened");
    if (key === "failedLogins" && anomalies > 0)
      return t("withAnomalies", { days, count: anomalies });
    return t("inRange", { days });
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard
          key={card.key}
          icon={card.icon}
          tone={card.tone}
          value={card.value}
          label={t(card.key)}
          hint={hintFor(card.key)}
          href={card.href}
          viewLabel={t("viewDetails")}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

export default StatsSection;
