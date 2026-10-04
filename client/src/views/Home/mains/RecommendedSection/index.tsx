"use client";

// libs
import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RecommendedAppCard from "../../components/RecommendedAppCard";
import SectionLink from "../../components/SectionLink";
// hooks
import { useToggleFavorite } from "@/hooks";
// others
import useHomeApps from "../../hooks/useHomeApps";
import CONSTANTS from "@/constants";

const { ROUTES } = CONSTANTS;

/**
 * Called "Explore", not "Recommended for you". The source is still the
 * catalog in display order — there is no ranking behind it, and a heading
 * that claims one is a promise the code does not keep.
 */
const RecommendedSection = () => {
  const t = useTranslations("home.explore");
  const tCTA = useTranslations("home.exploreCTA");
  const tCard = useTranslations("apps.card");
  const toggleFavorite = useToggleFavorite();
  const { data, isLoading, isError } = useHomeApps();
  const items = (data?.items ?? []).slice(4, 8);
  const total = data?.meta.total ?? 0;

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="recommended-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionHeading id="recommended-title">{t("title")}</SectionHeading>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <SectionLink href={ROUTES.APPS}>{t("seeAll")}</SectionLink>
      </div>

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={`rec-skeleton-${idx}`} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((app) => (
            <RecommendedAppCard
              key={app._id}
              id={app._id}
              name={app.displayName}
              category={app.category}
              iconUrl={app.iconUrl}
              homeUrl={app.homeUrl}
              openLabel={tCard("open")}
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

      <Card className="bg-card text-foreground mt-2 flex flex-col items-start justify-between gap-4 rounded-2xl border p-7 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className="bg-muted flex size-12 items-center justify-center rounded-xl"
            aria-hidden="true"
          >
            <Compass className="text-foreground size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-base font-semibold">{tCTA("title")}</p>
            <p className="text-muted-foreground text-xs">
              {tCTA("subtitle", { count: total })}
            </p>
          </div>
        </div>
        <SectionLink href={ROUTES.APPS}>{tCTA("cta")}</SectionLink>
      </Card>
    </section>
  );
};

export default RecommendedSection;
