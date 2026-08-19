"use client";

// libs
import { useState } from "react";
import { useTranslations } from "next-intl";
// types
import type { NotificationListTabValue } from "@/types/Notification";
// components
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CustomButton from "@/components/CustomButton";
import NotificationGroups from "../../components/NotificationGroups";
import NotificationGroupsSkeleton from "../../components/NotificationGroups/NotificationGroupsSkeleton";
// hooks
import { useAnnounce } from "@/hooks";
import useNotifications from "../../hooks/useNotifications";
import useMarkNotificationRead from "../../hooks/useMarkNotificationRead";

const NotificationList = () => {
  const t = useTranslations("notifications");
  const tGroups = useTranslations("notifications.groups");
  const tStates = useTranslations("notifications.states");
  const { announce } = useAnnounce();
  const [tab, setTab] = useState<NotificationListTabValue>("unread");
  const isRead = tab === "unread" ? false : true;

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useNotifications(isRead);
  const markRead = useMarkNotificationRead();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const handleTabChange = (value: string) => {
    const next = value as NotificationListTabValue;
    setTab(next);
    announce(t("announce.tabChanged", { tab: t(`tabs.${next}`) }));
  };

  const handleMarkRead = (id: string) =>
    markRead.mutate(id, {
      onSuccess: () => announce(t("announce.markedRead"))
    });

  const handleLoadMore = () => {
    fetchNextPage();
    announce(t("announce.loadingMore"));
  };

  return (
    <Card className="overflow-hidden rounded-xl border p-0">
      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="border-border bg-card border-b px-6 py-2">
          <TabsList>
            <TabsTrigger value="unread">{t("tabs.unread")}</TabsTrigger>
            <TabsTrigger value="read">{t("tabs.read")}</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value={tab} className="m-0">
          {isLoading ? (
            <NotificationGroupsSkeleton />
          ) : isError ? (
            <p className="text-destructive px-5 py-6 text-sm">
              {tStates("error")}
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground px-5 py-6 text-sm">
              {tStates("empty")}
            </p>
          ) : (
            <NotificationGroups
              items={items}
              groupLabels={{
                today: tGroups("today"),
                yesterday: tGroups("yesterday"),
                earlier: tGroups("earlier")
              }}
              markReadLabel={t("actions.markRead")}
              onMarkRead={handleMarkRead}
              isMarking={markRead.isPending}
            />
          )}
          {hasNextPage ? (
            <div className="flex items-center justify-center px-5 py-5">
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
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
