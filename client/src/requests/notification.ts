// types
import type {
  ApiNotification,
  NotificationListParams,
  NotificationListResponse
} from "@/types/Notification";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getNotifications = async (
  params?: NotificationListParams
): Promise<NotificationListResponse> => {
  const res = await axiosInstance.get<
    ResponsePattern<NotificationListResponse>
  >(END_POINTS.NOTIFICATIONS, { params });
  return res.data.data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const res = await axiosInstance.get<ResponsePattern<{ count: number }>>(
    END_POINTS.NOTIFICATIONS_UNREAD_COUNT
  );
  return res.data.data;
};

export const markNotificationRead = async (
  id: string
): Promise<ApiNotification> => {
  const res = await axiosInstance.patch<ResponsePattern<ApiNotification>>(
    generatePath(END_POINTS.NOTIFICATION_READ, { id })
  );
  return res.data.data;
};

export const markAllNotificationsRead = async (): Promise<{
  updated: number;
}> => {
  const res = await axiosInstance.patch<ResponsePattern<{ updated: number }>>(
    END_POINTS.NOTIFICATIONS_READ_ALL
  );
  return res.data.data;
};
