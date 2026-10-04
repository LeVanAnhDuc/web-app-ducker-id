// types
import type { OpenAPIV3 } from "openapi-types";

const appIdParam: OpenAPIV3.ParameterObject = {
  name: "appId",
  in: "path",
  required: true,
  description: "MongoDB ObjectId of the app",
  schema: {
    type: "string",
    pattern: "^[a-fA-F0-9]{24}$",
    example: "507f1f77bcf86cd799439011"
  }
};

const noContent: OpenAPIV3.ResponseObject = { description: "Done" };

export const recentAppPaths: OpenAPIV3.PathsObject = {
  "/users/me/recent-apps": {
    get: {
      summary: "List recently used apps",
      description: `
The apps the current user has opened, newest first, one row per app.

Only apps the user can still see in the catalog are returned (active, and
visible to the user's role); soft-deleted rows are excluded.

**Query params:**
- \`page\` — 1-based page number (default 1)
- \`limit\` — page size (default 20, max 100)
- \`search\` — case-insensitive match on the app name / display name / description
      `.trim(),
      tags: ["Recent Apps"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, example: 1 }
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100, example: 20 }
        },
        {
          name: "search",
          in: "query",
          required: false,
          schema: { type: "string", example: "blog" }
        }
      ],
      responses: {
        "200": {
          description: "Paginated recently used apps",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/RecentAppsListResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    },
    delete: {
      summary: "Clear recent history",
      description:
        "Soft-deletes every visible row for the current user. Rows are purged 30 days later; opening an app again brings it back with a fresh count.",
      tags: ["Recent Apps"],
      security: [{ bearerAuth: [] }],
      responses: {
        "204": noContent,
        "401": { $ref: "#/components/responses/Unauthorized" }
      }
    }
  },
  "/users/me/recent-apps/{appId}": {
    post: {
      summary: "Record an app launch",
      description:
        "Called by the launcher when the user opens an app. Upserts the row: inserts it, revives a soft-deleted one with a count of 1, or bumps `lastUsedAt` and `useCount` (writes within 60 seconds count once). Rate-limited per user.",
      tags: ["Recent Apps"],
      security: [{ bearerAuth: [] }],
      parameters: [appIdParam],
      responses: {
        "204": noContent,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    },
    delete: {
      summary: "Remove an app from recent history",
      description:
        "Soft-deletes the row (idempotent). It can be brought back with the restore endpoint.",
      tags: ["Recent Apps"],
      security: [{ bearerAuth: [] }],
      parameters: [appIdParam],
      responses: {
        "204": noContent,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    }
  },
  "/users/me/recent-apps/{appId}/restore": {
    post: {
      summary: "Undo removing an app from recent history",
      tags: ["Recent Apps"],
      security: [{ bearerAuth: [] }],
      parameters: [appIdParam],
      responses: {
        "204": noContent,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    }
  }
};
