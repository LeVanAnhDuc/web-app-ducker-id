"use client";
// libs
import { useTranslations } from "next-intl";
// components
import SectionHeading from "@/components/SectionHeading";
import QuickAccessCard from "../../components/QuickAccessCard";
import { Skeleton } from "@/components/ui/skeleton";
// hooks
import { useToggleFavorite } from "@/hooks";
// others
import useHomeApps from "../../hooks/useHomeApps";

const QuickAccessSection = () => {
  const t = useTranslations("home.quickAccess");
  const tCard = useTranslations("apps.card");
  const toggleFavorite = useToggleFavorite();
  const { data, isLoading, isError } = useHomeApps();
  const items = (data?.items ?? []).slice(0, 4);
  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="quick-access-title"
    >
      <div className="flex items-center justify-between">
        <div>
          <SectionHeading id="quick-access-title">{t("title")}</SectionHeading>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
      </div>
      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton
              key={`qa-skeleton-${idx}`}
              className="h-[140px] rounded-xl"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("empty")}
        </p>
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
