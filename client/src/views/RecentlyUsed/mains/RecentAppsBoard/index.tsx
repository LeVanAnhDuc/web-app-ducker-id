"use client";
// libs
import { History, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
// components
import CustomButton from "@/components/CustomButton";
import PageShell from "@/components/PageContainer/PageShell";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageToolbar from "@/components/PageContainer/PageToolbar";
import PageContent from "@/components/PageContainer/PageContent";
import RecentAppsList from "../../components/RecentAppsList";
import RecentAppsSkeleton from "../../components/RecentAppsSkeleton";
import ClearHistoryDialog from "../ClearHistoryDialog";
// ghosts
import LoadMoreTrigger from "../../ghosts/LoadMoreTrigger";
// hooks
import { useListQuery } from "@/hooks";
import useRecentApps from "../../hooks/useRecentApps";
// others
import { useRouter } from "@/i18n/navigation";
import CONSTANTS from "@/constants";

const RecentAppsBoard = () => {
  const t = useTranslations("recentlyUsed");
  const router = useRouter();
  const query = useListQuery();
  const [clearOpen, setClearOpen] = useState(false);
  const loadMoreRef = useRef<HTMLButtonElement>(null);

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useRecentApps(query.appliedSearch || undefined);
  // Offset pages can repeat a row when an app is opened elsewhere between two
  // page loads; keep the first (newest) copy.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages.flatMap((p) => p.items) ?? []).filter(
      (app) => !seen.has(app._id) && Boolean(seen.add(app._id))
    );
  }, [data]);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage) fetchNextPage();
  }, [isFetchingNextPage, fetchNextPage]);

  const hasSearch = Boolean(query.appliedSearch);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <CustomButton
            variant="outline"
            iconLeft={<Trash2 className="size-4" aria-hidden="true" />}
            onClick={() => setClearOpen(true)}
            disabled={items.length === 0 && !hasSearch}
            className="text-destructive hover:text-destructive shrink-0"
          >
            {t("clear")}
          </CustomButton>
        }
      />
      <PageToolbar query={query} searchPlaceholder={t("search.placeholder")} />
      <PageContent
        isLoading={isLoading}
        isEmpty={items.length === 0 && !isError}
        hasActiveFilters={hasSearch}
        onClearFilters={query.clearFilters}
        skeleton={<RecentAppsSkeleton />}
        emptyTitle={hasSearch ? undefined : t("empty.title")}
        emptyDescription={hasSearch ? undefined : t("empty.description")}
        emptyIcon={
          <History
            className="text-muted-foreground size-6"
            aria-hidden="true"
          />
        }
        emptyAction={
          <CustomButton onClick={() => router.push(CONSTANTS.ROUTES.APPS)}>
            {t("empty.browse")}
          </CustomButton>
        }
      >
        <RecentAppsList
          items={items}
          isError={isError}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loadMoreRef={loadMoreRef}
          onLoadMore={handleLoadMore}
        />
      </PageContent>
      <LoadMoreTrigger
        targetRef={loadMoreRef}
        enabled={hasNextPage && !isFetchingNextPage}
        onReach={handleLoadMore}
      />
      <ClearHistoryDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
      />
    </PageShell>
  );
};

export default RecentAppsBoard;
