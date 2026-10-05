"use client";

// libs
import { useTranslations } from "next-intl";
// types
import type { ApiNotification, NotifGroup } from "@/types/Notification";
// components
import NotificationItem from "@/components/NotificationItem";
import GroupHeader from "../GroupHeader";
// others
import CONSTANTS from "@/constants";
import { groupOf } from "@/utils/notifications";

const GROUP_ORDER: NotifGroup[] = [
  CONSTANTS.NOTIF_GROUP.TODAY,
  CONSTANTS.NOTIF_GROUP.YESTERDAY,
  CONSTANTS.NOTIF_GROUP.EARLIER
];

const NotificationGroups = ({
  items,
  onOpen,
  onMarkRead,
  isMarking
}: {
  items: ApiNotification[];
  onOpen: (notification: ApiNotification) => void;
  onMarkRead: (id: string) => void;
  isMarking: boolean;
}) => {
  const t = useTranslations("notifications.groups");
  const now = Date.now();
  const grouped: Record<NotifGroup, ApiNotification[]> = {
    today: [],
    yesterday: [],
    earlier: []
  };
  items.forEach((item) => grouped[groupOf(item.createdAt, now)].push(item));
  return (
    <>
      {GROUP_ORDER.map((group) =>
        grouped[group].length > 0 ? (
          <section key={group} aria-label={t(group)}>
            <GroupHeader label={t(group)} />
            <ul className="divide-border flex flex-col divide-y">
              {grouped[group].map((n) => (
                <li key={n.id}>
                  <NotificationItem
                    notification={n}
                    onOpen={onOpen}
                    onMarkRead={onMarkRead}
                    isMarking={isMarking}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null
      )}
    </>
  );
};

export default NotificationGroups;
