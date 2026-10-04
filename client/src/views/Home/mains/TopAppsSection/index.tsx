"use client";

// types
import type { RecentAppsStats } from "@/types/RecentlyUsed";
// libs
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CountBarList from "../../components/CountBarList";
import SectionLink from "../../components/SectionLink";
// others
import CONSTANTS from "@/constants";

const { ROUTES } = CONSTANTS;

/**
 * `useCount` is a lifetime counter, so this ranking cannot follow the range
 * toggle above it. The subtitle says so out loud — a reader who assumes
 * otherwise would read these numbers as "this week" and be badly wrong.
 */
const TopAppsSection = ({
  stats,
  isLoading
}: {
  stats?: RecentAppsStats;
  isLoading: boolean;
}) => {
  const t = useTranslations("home.topApps");
  const topApps = stats?.topApps ?? [];

  return (
    <Card className="rounded-2xl border p-6" aria-labelledby="home-top-apps">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <SectionHeading id="home-top-apps">{t("title")}</SectionHeading>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <SectionLink href={ROUTES.RECENTLY_USED}>{t("seeAll")}</SectionLink>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`top-app-${index}`} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : topApps.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <CountBarList
          rows={topApps.map((app) => ({
            key: app.appId,
            label: app.displayName,
            hint: app.category ?? undefined,
            count: app.useCount,
            href: ROUTES.RECENTLY_USED
          }))}
          caption={t("tableCaption")}
          labelColumn={t("appColumn")}
          countColumn={t("opensColumn")}
          countLabel={(count) => t("opens", { count })}
        />
      )}
    </Card>
  );
};

export default TopAppsSection;
