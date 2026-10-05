"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type {
  NotificationCategoryFilter as CategoryFilter,
  NotificationStatusTab
} from "@/types/Notification";
// components
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CustomButton from "@/components/CustomButton";
import NotificationCategoryFilter from "../../components/NotificationCategoryFilter";
import NotificationListBody from "../../components/NotificationListBody";
// hooks
import { useAnnounce } from "@/hooks";
import useNotifications from "../../hooks/useNotifications";
import useMarkNotificationRead from "../../hooks/useMarkNotificationRead";
import useOpenNotification from "../../hooks/useOpenNotification";
// dataSources
import { NOTIFICATION_STATUS_TABS } from "@/dataSources/Notifications";
// others
import CONSTANTS from "@/constants";

const { STATUS_TAB, CATEGORY_FILTER_ALL } = CONSTANTS.NOTIFICATION;

const IS_READ_BY_TAB: Record<NotificationStatusTab, boolean | undefined> = {
  all: undefined,
  unread: false,
  read: true
};

const NotificationList = () => {
  const t = useTranslations("notifications");
  const { announce } = useAnnounce();
  const [tab, setTab] = useState<NotificationStatusTab>(STATUS_TAB.ALL);
  const [category, setCategory] = useState<CategoryFilter>(CATEGORY_FILTER_ALL);
  const list = useNotifications({
    isRead: IS_READ_BY_TAB[tab],
    category: category === CATEGORY_FILTER_ALL ? undefined : category
  });
  const markRead = useMarkNotificationRead();
  const open = useOpenNotification();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const handleTabChange = (value: string) => {
    const next = value as NotificationStatusTab;
    setTab(next);
    announce(t("announce.tabChanged", { tab: t(`tabs.${next}`) }));
  };
  const handleCategoryChange = (next: CategoryFilter) => {
    setCategory(next);
    announce(
      t("announce.categoryChanged", { category: t(`categories.${next}`) })
    );
  };
  const handleMarkRead = (id: string) =>
    markRead.mutate(id, {
      onSuccess: () => announce(t("announce.markedRead"))
    });
  const handleLoadMore = () => {
    list.fetchNextPage();
    announce(t("announce.loadingMore"));
  };
  return (
    <Card className="gap-0 overflow-hidden rounded-xl border p-0">
      <Tabs value={tab} onValueChange={handleTabChange} className="gap-0">
        <div className="border-border bg-card border-b px-4 py-2 sm:px-6">
          <TabsList>
            {NOTIFICATION_STATUS_TABS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {t(`tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <NotificationCategoryFilter
          value={category}
          onChange={handleCategoryChange}
        />
        <TabsContent value={tab} className="m-0">
          <NotificationListBody
            items={items}
            isLoading={list.isLoading}
            isError={list.isError}
            onRetry={() => list.refetch()}
            onOpen={open}
            onMarkRead={handleMarkRead}
            isMarking={markRead.isPending}
          />
          {list.hasNextPage ? (
            <div className="border-border flex items-center justify-center border-t px-5 py-4">
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={list.isFetchingNextPage}
              >
                {t("actions.loadMore")}
              </CustomButton>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default NotificationList;
