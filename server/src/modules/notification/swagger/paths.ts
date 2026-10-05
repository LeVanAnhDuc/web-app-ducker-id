// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import { NOTIFICATION_CATEGORIES } from "@/modules/notification/constants";
// common
import { PAGINATION } from "@/common/pagination";

const ok = (
  description: string,
  data: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): OpenAPIV3.ResponseObject => ({
  description,
  content: {
    "application/json": {
      schema: {
        allOf: [
          { $ref: "#/components/schemas/SuccessResponse" },
          { type: "object", properties: { data } }
        ]
      }
    }
  }
});

const authErrors = {
  "401": { $ref: "#/components/responses/Unauthorized" }
};

export const notificationPaths: OpenAPIV3.PathsObject = {
  "/notifications": {
    get: {
      summary: "List my notifications",
      description: `
Newest first. Notifications are written by domain events (password changed,
account locked, unusual sign-in, new app) through the \`notification\` queue,
so a new one can appear a moment after the event.

**Authentication:** Bearer token. Only the caller's own notifications.
      `.trim(),
      tags: ["Notifications"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 }
        },
        {
          name: "limit",
          in: "query",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: PAGINATION.MAX_LIMIT,
            default: PAGINATION.DEFAULT_LIMIT
          }
        },
        { name: "isRead", in: "query", schema: { type: "boolean" } },
        {
          name: "category",
          in: "query",
          schema: {
            type: "string",
            enum: Object.values(NOTIFICATION_CATEGORIES)
          }
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"], default: "desc" }
        }
      ],
      responses: {
        "200": ok("Notifications retrieved", {
          $ref: "#/components/schemas/NotificationList"
        }),
        "400": { $ref: "#/components/responses/ValidationError" },
        ...authErrors
      }
    }
  },
  "/notifications/unread-count": {
    get: {
      summary: "Count my unread notifications",
      tags: ["Notifications"],
      security: [{ bearerAuth: [] }],
      responses: {
        "200": ok("Unread count retrieved", {
          type: "object",
          properties: { count: { type: "integer", example: 3 } }
        }),
        ...authErrors
      }
    }
  },
  "/notifications/{id}/read": {
    patch: {
      summary: "Mark one notification as read",
      tags: ["Notifications"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
        }
      ],
      responses: {
        "200": ok("Notification marked as read", {
          $ref: "#/components/schemas/NotificationItem"
        }),
        "400": { $ref: "#/components/responses/ValidationError" },
        ...authErrors,
        "404": { $ref: "#/components/responses/NotFound" }
      }
    }
  },
  "/notifications/read-all": {
    patch: {
      summary: "Mark all my notifications as read",
      tags: ["Notifications"],
      security: [{ bearerAuth: [] }],
      responses: {
        "200": ok("All notifications marked as read", {
          type: "object",
          properties: { updated: { type: "integer", example: 4 } }
        }),
        ...authErrors
      }
    }
  }
};
