// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES
} from "@/modules/notification/constants";

export const notificationSwaggerSchemas: Record<
  string,
  OpenAPIV3.SchemaObject
> = {
  NotificationItem: {
    type: "object",
    required: [
      "id",
      "type",
      "category",
      "params",
      "link",
      "isRead",
      "readAt",
      "createdAt"
    ],
    properties: {
      id: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
        example: "507f1f77bcf86cd799439012"
      },
      type: {
        type: "string",
        enum: Object.values(NOTIFICATION_TYPES),
        example: NOTIFICATION_TYPES.LOGIN_ANOMALY
      },
      category: {
        type: "string",
        enum: Object.values(NOTIFICATION_CATEGORIES),
        example: NOTIFICATION_CATEGORIES.SECURITY
      },
      params: {
        type: "object",
        additionalProperties: {
          oneOf: [{ type: "string" }, { type: "number" }]
        },
        description:
          "Values for the client's localized template `notifications.types.<type>`. No text is stored server-side.",
        example: {
          reason: "device",
          browser: "Chrome",
          os: "Windows",
          country: "VN"
        }
      },
      link: {
        type: "string",
        nullable: true,
        description:
          "Internal client path the notification opens (always starts with a single `/`)",
        example: "/login-history"
      },
      isRead: { type: "boolean", example: false },
      readAt: {
        type: "string",
        format: "date-time",
        nullable: true,
        example: null
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2026-10-05T08:00:00.000Z"
      }
    }
  },
  NotificationList: {
    type: "object",
    required: ["items", "meta"],
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/NotificationItem" }
      },
      meta: { $ref: "#/components/schemas/PaginationMeta" }
    }
  }
};
