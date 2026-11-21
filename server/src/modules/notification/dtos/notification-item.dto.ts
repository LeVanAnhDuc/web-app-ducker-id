// types
import type {
  NotificationCategory,
  NotificationDocument,
  NotificationParams,
  NotificationType
} from "@/modules/notification/types";
// common
import {
  Expose,
  ExposeDate,
  ExposeFrom,
  ExposeId,
  ExposeOrNull
} from "@/common/dto";

/** Source: a notification record. Text is rendered by the client from `type` + `params`. */
export class NotificationItemDto {
  @ExposeId("_id") id!: string;
  @Expose() type!: NotificationType;
  @Expose() category!: NotificationCategory;
  @ExposeFrom<NotificationDocument>((doc) => doc.params ?? {})
  params!: NotificationParams;
  @ExposeOrNull() link!: string | null;
  @Expose() isRead!: boolean;
  @ExposeDate() readAt!: string | null;
  @ExposeDate() createdAt!: string;
}
