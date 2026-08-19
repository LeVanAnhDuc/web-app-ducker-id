"use client";

// types
import type { ApiNotification, NotifGroup } from "@/types/Notification";
// components
import NotificationItem from "../NotificationItem";
import GroupHeader from "../GroupHeader";
// hooks
import { useFormatTime } from "@/hooks";
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
  groupLabels,
  markReadLabel,
  onMarkRead,
  isMarking
}: {
  items: ApiNotification[];
  groupLabels: Record<NotifGroup, string>;
  markReadLabel: string;
  onMarkRead: (id: string) => void;
  isMarking: boolean;
}) => {
  const ft = useFormatTime();
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
          <div key={group}>
            <GroupHeader label={groupLabels[group]} />
            {grouped[group].map((n) => (
              <NotificationItem
                key={n.id}
                type={n.type}
                title={n.title}
                message={n.message}
                timestamp={ft("relative", n.createdAt)}
                isRead={n.isRead}
                markReadLabel={markReadLabel}
                onMarkRead={() => onMarkRead(n.id)}
                isMarking={isMarking}
              />
            ))}
          </div>
        ) : null
      )}
    </>
  );
};

export default NotificationGroups;
