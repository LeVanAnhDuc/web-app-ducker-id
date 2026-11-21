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
import { ApiProperty } from "@/common/openapi";
// modules
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES
} from "@/modules/notification/constants";

/** Source: a notification record. Text is rendered by the client from `type` + `params`. */
export class NotificationItemDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439012" })
  @ExposeId("_id")
  id!: string;

  @ApiProperty({
    type: "string",
    enum: Object.values(NOTIFICATION_TYPES),
    example: NOTIFICATION_TYPES.LOGIN_ANOMALY
  })
  @Expose()
  type!: NotificationType;

  @ApiProperty({
    type: "string",
    enum: Object.values(NOTIFICATION_CATEGORIES),
    example: NOTIFICATION_CATEGORIES.SECURITY
  })
  @Expose()
  category!: NotificationCategory;

  @ApiProperty(() => ({
    type: "object",
    additionalProperties: { oneOf: [{ type: "string" }, { type: "number" }] },
    description:
      "Values for the client's localized template `notifications.types.<type>`. No text is stored server-side.",
    example: {
      reason: "device",
      browser: "Chrome",
      os: "Windows",
      country: "VN"
    }
  }))
  @ExposeFrom<NotificationDocument>((doc) => doc.params ?? {})
  params!: NotificationParams;

  @ApiProperty({
    type: "string",
    description:
      "Internal client path the notification opens (always starts with a single `/`)",
    example: "/login-history"
  })
  @ExposeOrNull()
  link!: string | null;

  @ApiProperty({ example: false })
  @Expose()
  isRead!: boolean;

  @ApiProperty({ nullable: true, example: null })
  @ExposeDate()
  readAt!: string | null;

  @ApiProperty({ example: "2026-10-05T08:00:00.000Z" })
  @ExposeDate()
  createdAt!: string;
}

/** `data` of `GET /notifications/unread-count`. Plain data. */
export class UnreadCountDto {
  @ApiProperty({ type: "integer", example: 3 })
  count!: number;
}

/** `data` of `PATCH /notifications/read-all`. Plain data. */
export class MarkedReadCountDto {
  @ApiProperty({
    type: "integer",
    example: 4,
    description: "How many notifications were unread before"
  })
  updated!: number;
}
