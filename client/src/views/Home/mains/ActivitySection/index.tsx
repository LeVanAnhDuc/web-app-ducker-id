"use client";

// types
import type { LoginHistoryStats, LoginStatsRange } from "@/types/LoginHistory";
// libs
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityChart from "../../components/ActivityChart";
import RangeToggle from "../../components/RangeToggle";
import SectionLink from "../../components/SectionLink";
// ghosts
import LoginStatsAnnouncer from "../../ghosts/LoginStatsAnnouncer";
// others
import CONSTANTS from "@/constants";
import { cn } from "@/libs/utils";

const { ROUTES } = CONSTANTS;
// Below this, the chart is mostly whitespace and the reason deserves saying.
const SPARSE_THRESHOLD = 3;

const ActivitySection = ({
  stats,
  isLoading,
  isFetching,
  isError,
  range,
  onRangeChange
}: {
  stats?: LoginHistoryStats;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  range: LoginStatsRange;
  onRangeChange: (next: LoginStatsRange) => void;
}) => {
  const t = useTranslations("home.activity");
  const tRange = useTranslations("home.range");
  const days = stats?.byDay ?? [];
  const total = stats?.total ?? 0;

  return (
    <Card
      className="rounded-2xl border p-6 md:p-7"
      aria-labelledby="home-activity-title"
    >
      <LoginStatsAnnouncer
        isLoading={isLoading}
        total={stats?.total}
        days={stats?.range.days ?? 0}
      />

      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-0.5">
          <SectionHeading id="home-activity-title">{t("title")}</SectionHeading>
          <p className="text-muted-foreground text-sm">
            {stats
              ? t("subtitle", {
                  days: stats.range.days,
                  timezone: stats.range.timezone
                })
              : tRange("retention")}
          </p>
        </div>
        <RangeToggle value={range} onChange={onRangeChange} />
      </div>

      {isError ? (
        <p className="text-destructive py-10 text-center text-sm" role="alert">
          {t("error")}
        </p>
      ) : isLoading || !stats ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : (
        <>
          {/* Kept mounted while a new range loads: tearing the chart down and
              rebuilding it on every toggle is what makes a dashboard feel
              broken even when the data is right. */}
          <div
            className={cn(
              "transition-opacity",
              isFetching && "pointer-events-none opacity-60"
            )}
          >
            <ActivityChart days={days} />
          </div>

          <p className="text-muted-foreground mt-4 text-center text-xs">
            {total === 0
              ? t("empty")
              : total <= SPARSE_THRESHOLD
                ? t("sparse", { count: total })
                : t("dayHint")}
          </p>
        </>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          {tRange("retention")}
        </span>
        <SectionLink href={ROUTES.LOGIN_HISTORY}>{t("seeHistory")}</SectionLink>
      </div>
    </Card>
  );
};

export default ActivitySection;
