"use client";

// libs
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import { Skeleton } from "@/components/ui/skeleton";
import QuickAccessCard from "../../components/QuickAccessCard";
import SectionLink from "../../components/SectionLink";
// hooks
import { useToggleFavorite } from "@/hooks";
// requests
import { getRecentApps } from "@/requests/recentApps";
// others
import useHomeApps from "../../hooks/useHomeApps";
import CONSTANTS from "@/constants";

const { QUERY_KEYS, ROUTES } = CONSTANTS;
const TILES = 4;

/**
 * "Jump back in" now means what it says: the apps this user actually opened,
 * newest first. It used to be the first four rows of the catalog, which is a
 * different sentence entirely.
 *
 * A brand-new account has no history, so the catalog still backs the empty
 * case — an empty row here would be the first thing a new user sees.
 */
const QuickAccessSection = () => {
  const t = useTranslations("home.quickAccess");
  const tCard = useTranslations("apps.card");
  const toggleFavorite = useToggleFavorite();

  const { data, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEYS.RECENT_APPS, { limit: TILES }],
    queryFn: () => getRecentApps({ limit: TILES })
  });

  const catalog = useHomeApps();
  const recent = data?.items ?? [];
  const isEmpty = !isLoading && recent.length === 0;
  const items = isEmpty ? (catalog.data?.items ?? []).slice(0, TILES) : recent;

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="quick-access-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionHeading id="quick-access-title">{t("title")}</SectionHeading>
          <p className="text-muted-foreground text-sm">
            {isEmpty ? t("empty") : t("subtitle")}
          </p>
        </div>
        <SectionLink href={ROUTES.RECENTLY_USED}>{t("seeAll")}</SectionLink>
      </div>

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: TILES }).map((_, idx) => (
            <Skeleton
              key={`qa-skeleton-${idx}`}
              className="h-[140px] rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((app) => (
            <QuickAccessCard
              key={app._id}
              id={app._id}
              name={app.displayName}
              category={app.category}
              iconUrl={app.iconUrl}
              homeUrl={app.homeUrl}
              isFavorite={app.isFavorite}
              addFavoriteLabel={tCard("addFavorite")}
              removeFavoriteLabel={tCard("removeFavorite")}
              togglePending={toggleFavorite.isPending}
              onToggleFavorite={() =>
                toggleFavorite.mutate({
                  appId: app._id,
                  isFavorite: app.isFavorite
                })
              }
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default QuickAccessSection;
