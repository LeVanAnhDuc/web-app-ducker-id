// types
import type { OpenAPIV3 } from "openapi-types";

export const recentAppSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  RecentAppResponse: {
    allOf: [
      { $ref: "#/components/schemas/UserAppResponse" },
      {
        type: "object",
        required: ["lastUsedAt", "useCount"],
        properties: {
          lastUsedAt: {
            type: "string",
            format: "date-time",
            example: "2026-10-04T08:30:00.000Z",
            description: "When the user last opened the app"
          },
          useCount: {
            type: "integer",
            minimum: 1,
            example: 4,
            description:
              "Opens since the row was created or last revived; writes inside the 60s dedupe window count once"
          }
        }
      }
    ]
  },
  RecentAppsListResponse: {
    type: "object",
    required: ["items", "meta"],
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/RecentAppResponse" }
      },
      meta: { $ref: "#/components/schemas/PaginationMeta" }
    }
  }
};
