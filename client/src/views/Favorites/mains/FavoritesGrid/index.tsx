"use client";
// libs
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { FavoritesSortKey } from "@/types/Apps";
// components
import AppCard from "@/components/AppCard";
import AppCardSkeleton from "@/views/Apps/components/AppCardSkeleton";
import CustomButton from "@/components/CustomButton";
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageToolbar from "@/components/PageContainer/PageToolbar";
import PageContent from "@/components/PageContainer/PageContent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
// hooks
import { useListQuery, useToggleFavorite } from "@/hooks";
import useFavorites from "../../hooks/useFavorites";
import useAppCategories from "@/views/Apps/hooks/useAppCategories";
// dataSources
import { buildFavoritesFilterDefs } from "@/dataSources/Favorites";
// others
import { resolveCategoryLabel } from "@/utils";
import CONSTANTS from "@/constants";

const FavoritesGridSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, idx) => (
      <AppCardSkeleton key={`skeleton-${idx}`} />
    ))}
  </div>
);

const FavoritesGrid = () => {
  const t = useTranslations("favorites");
  const tCat = useTranslations("common.categories");

  // sort is a display preference — kept in local state, not URL
  const [sort, setSort] = useState<FavoritesSortKey>(
    CONSTANTS.FAVORITES_SORT.RECENT
  );

  const { data: categories = [] } = useAppCategories();

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat._id,
        label: resolveCategoryLabel(tCat, cat.slug, cat.displayName)
      })),
    [categories, tCat]
  );

  const filterDefs = useMemo(
    () =>
      buildFavoritesFilterDefs(categoryOptions, {
        category: t("categories.groupLabel")
      }),
    [categoryOptions, t]
  );

  const query = useListQuery(filterDefs);

  const params = {
    sort,
    ...(query.appliedSearch && { search: query.appliedSearch }),
    ...(query.filters.categoryId && { categoryId: query.filters.categoryId })
  };

  const { data, isLoading, isError } = useFavorites(params);
  const toggleFavorite = useToggleFavorite();
  const items = data?.items ?? [];

  const hasActiveFilters =
    query.activeFilterCount > 0 || Boolean(query.appliedSearch);

  const SortDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CustomButton
          size="default"
          variant="outline"
          iconLeft={<ArrowUpDown className="size-3.5" aria-hidden="true" />}
          iconRight={<ChevronDown className="size-3.5" aria-hidden="true" />}
          className="h-10"
        >
          {t("sort.label", { value: t(`sort.${sort}`) })}
        </CustomButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setSort(CONSTANTS.FAVORITES_SORT.RECENT)}
        >
          {t("sort.recent")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setSort(CONSTANTS.FAVORITES_SORT.NAME)}
        >
          {t("sort.name")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("description")} />
      <PageToolbar
        query={query}
        filterDefs={filterDefs}
        searchPlaceholder={t("search.placeholder")}
        rightSlot={SortDropdown}
      />
      <PageContent
        isLoading={isLoading}
        isEmpty={items.length === 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={query.clearFilters}
        skeleton={<FavoritesGridSkeleton />}
        emptyTitle={t("empty")}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isError && (
            <p className="text-destructive col-span-full text-sm" role="alert">
              {t("error")}
            </p>
          )}
          {items.map((app) => (
            <AppCard
              key={app._id}
              id={app._id}
              displayName={app.displayName}
              category={
                app.category
                  ? resolveCategoryLabel(
                      tCat,
                      app.categorySlug ?? "",
                      app.category
                    )
                  : null
              }
              description={app.description}
              iconUrl={app.iconUrl}
              homeUrl={app.homeUrl}
              isFavorite={app.isFavorite}
              openLabel={t("card.open")}
              addFavoriteLabel={t("card.add")}
              removeFavoriteLabel={t("card.remove")}
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
      </PageContent>
    </PageShell>
  );
};

export default FavoritesGrid;
