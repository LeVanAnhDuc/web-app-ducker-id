"use client";
// libs
import { useMemo } from "react";
import { useTranslations } from "next-intl";
// types
import type { RefObject } from "react";
import type { RecentApp } from "@/types/RecentlyUsed";
// components
import RecentAppGroup from "../RecentAppGroup";
import RecentAppRow from "../RecentAppRow";
import LoadMoreButton from "../LoadMoreButton";
import AllLoadedNote from "../AllLoadedNote";
// hooks
import { useFormatTime, useOpenApp, useToggleFavorite } from "@/hooks";
import useHideRecentApp from "../../hooks/useHideRecentApp";
// others
import { groupRecentApps } from "@/utils/recentApps";

const RecentAppsList = ({
  items,
  isError,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
  onLoadMore
}: {
  items: RecentApp[];
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: RefObject<HTMLButtonElement | null>;
  onLoadMore: () => void;
}) => {
  const t = useTranslations("recentlyUsed");
  const formatTime = useFormatTime();
  const openApp = useOpenApp();
  const toggleFavorite = useToggleFavorite();
  const hideApp = useHideRecentApp();
  const groups = useMemo(() => groupRecentApps(items, Date.now()), [items]);
  const labels = {
    open: t("card.open"),
    remove: t("card.remove"),
    lastOpened: t("card.lastOpened"),
    addFavorite: t("card.addFavorite"),
    removeFavorite: t("card.removeFavorite")
  };

  return (
    <div className="flex flex-col gap-6">
      {isError && (
        <p className="text-destructive text-sm" role="alert">
          {t("error")}
        </p>
      )}
      {groups.map((group) => (
        <RecentAppGroup
          key={group.key}
          groupKey={group.key}
          title={t(`groups.${group.key}`)}
          countLabel={t("groupCount", { count: group.apps.length })}
        >
          {group.apps.map((app) => (
            <li key={app._id}>
              <RecentAppRow
                id={app._id}
                name={app.displayName}
                category={app.category}
                iconUrl={app.iconUrl}
                lastOpened={formatTime("relative", app.lastUsedAt)}
                openedCount={t("card.openedCount", { count: app.useCount })}
                isFavorite={app.isFavorite}
                labels={labels}
                togglePending={toggleFavorite.isPending}
                removePending={hideApp.isPending}
                onOpen={() => openApp(app)}
                onToggleFavorite={() =>
                  toggleFavorite.mutate({
                    appId: app._id,
                    isFavorite: app.isFavorite
                  })
                }
                onRemove={() => hideApp.mutate(app)}
              />
            </li>
          ))}
        </RecentAppGroup>
      ))}
      {hasNextPage ? (
        <LoadMoreButton
          buttonRef={loadMoreRef}
          loading={isFetchingNextPage}
          onClick={onLoadMore}
        />
      ) : (
        items.length > 0 && <AllLoadedNote />
      )}
    </div>
  );
};

export default RecentAppsList;
