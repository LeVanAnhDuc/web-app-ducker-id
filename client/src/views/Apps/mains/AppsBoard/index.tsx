"use client";

// libs
import { LayoutGrid, List } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { UserCategory } from "@/types/Apps";
// components
import CustomButton from "@/components/CustomButton";
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageToolbar from "@/components/PageContainer/PageToolbar";
import PageContent from "@/components/PageContainer/PageContent";
import CustomPagination from "@/components/CustomPagination";
import AppCard from "@/components/AppCard";
import AppCardSkeleton from "../../components/AppCardSkeleton";
// hooks
import { useListQuery, useToggleFavorite } from "@/hooks";
import useApps from "../../hooks/useApps";
import useAppCategories from "../../hooks/useAppCategories";
// dataSources
import { buildAppsFilterDefs } from "@/dataSources/Apps";
// others
import { cn } from "@/libs/utils";
import { resolveCategoryLabel } from "@/utils";
import CONSTANTS from "@/constants";

const AppsBoardSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: CONSTANTS.LIST.DEFAULT_PAGE_SIZE }).map((_, idx) => (
      <AppCardSkeleton key={`skeleton-${idx}`} />
    ))}
  </div>
);

const ViewToggle = ({
  view,
  onViewChange
}: {
  view: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
}) => {
  const t = useTranslations("list");
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("viewGrid")}
    >
      <CustomButton
        size="icon"
        aria-label={t("viewGrid")}
        aria-pressed={view === "grid"}
        onClick={() => onViewChange("grid")}
        className={cn(
          "size-10",
          view === "grid"
            ? "bg-secondary text-secondary-foreground"
            : "border-border bg-background hover:bg-muted text-muted-foreground border"
        )}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
      </CustomButton>
      <CustomButton
        size="icon"
        aria-label={t("viewList")}
        aria-pressed={view === "list"}
        onClick={() => onViewChange("list")}
        className={cn(
          "size-10",
          view === "list"
            ? "bg-secondary text-secondary-foreground"
            : "border-border bg-background hover:bg-muted text-muted-foreground border"
        )}
      >
        <List className="size-4" aria-hidden="true" />
      </CustomButton>
    </div>
  );
};

const AppsBoard = ({
  categories: serverCategories
}: {
  categories: UserCategory[] | null;
}) => {
  const t = useTranslations("apps");
  const tToolbar = useTranslations("apps.categories");
  const tCat = useTranslations("common.categories");

  // view is a display preference — kept in local state, not URL
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: fallbackCategories = [] } = useAppCategories({
    enabled: serverCategories == null
  });
  const categories = serverCategories ?? fallbackCategories;

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
      buildAppsFilterDefs(categoryOptions, {
        category: tToolbar("groupLabel")
      }),
    [categoryOptions, tToolbar]
  );

  const query = useListQuery(filterDefs);
  const {
    page,
    appliedSearch,
    filters,
    activeFilterCount,
    clearFilters,
    setPage
  } = query;

  const params = {
    page,
    limit: CONSTANTS.LIST.DEFAULT_PAGE_SIZE,
    ...(appliedSearch && { search: appliedSearch }),
    ...(filters.categoryId && { categoryId: filters.categoryId })
  };

  const { data, isLoading, isError } = useApps(params);
  const { isPending: togglePending, mutate: mutateToggle } =
    useToggleFavorite();
  const items = data?.items ?? [];
  const meta = data?.meta;

  const hasActiveFilters = activeFilterCount > 0 || Boolean(appliedSearch);

  return (
    <PageShell>
      <PageHeader title={t("title")} description={t("description")} />
      <PageToolbar
        query={query}
        filterDefs={filterDefs}
        searchPlaceholder={t("search.placeholder")}
        rightSlot={<ViewToggle view={view} onViewChange={setView} />}
      />
      <PageContent
        isLoading={isLoading}
        isEmpty={items.length === 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        skeleton={<AppsBoardSkeleton />}
        emptyTitle={t("empty")}
      >
        <div
          className={cn(
            "grid gap-4",
            view === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          )}
        >
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
              addFavoriteLabel={t("card.addFavorite")}
              removeFavoriteLabel={t("card.removeFavorite")}
              togglePending={togglePending}
              onToggleFavorite={() =>
                mutateToggle({
                  appId: app._id,
                  isFavorite: app.isFavorite
                })
              }
            />
          ))}
        </div>
      </PageContent>
      {(meta?.totalPages ?? 1) > 1 && (
        <CustomPagination
          page={meta?.page ?? page}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={setPage}
        />
      )}
    </PageShell>
  );
};

export default AppsBoard;
