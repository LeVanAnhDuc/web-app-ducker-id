// types
import type { OpenAPIV3 } from "openapi-types";

export const webAppPaths: OpenAPIV3.PathsObject = {
  "/admin/apps": {
    post: {
      summary: "Register a new app (admin)",
      description: `
Register a satellite app with the IDMS. Generates an OAuth \`clientId\` and \`clientSecret\` — the secret is returned **once** in the response and will not be retrievable again.

**Authentication:**
- Requires valid Bearer token (admin role)

**Business rules:**
- \`name\` must be unique across all apps (lowercase, alphanumeric + hyphens)
- \`categoryId\` must reference an existing category
- \`clientSecret\` is bcrypt-hashed before storage; the plaintext is returned only in this response
      `.trim(),
      tags: ["Web App Admin"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminAppCreateBody" }
          }
        }
      },
      responses: {
        "201": {
          description:
            "App registered successfully — includes one-time clientSecret",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/AdminAppCreatedResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": {
          description: "Conflict — an app with this name already exists",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    },
    get: {
      summary: "List apps (admin)",
      description: `
List registered apps for the admin console.

**Authentication:**
- Requires valid Bearer token (admin role)

**Filtering:**
- \`search\` — case-insensitive match on app name / display name
- \`status\` — filter by app status (\`active\` | \`inactive\`)
- \`categoryId\` — filter by owning category (MongoDB ObjectId)
      `.trim(),
      tags: ["Web App Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "search",
          in: "query",
          required: false,
          description:
            "Case-insensitive keyword to match app name / display name",
          schema: {
            type: "string",
            example: "monitor"
          }
        },
        {
          name: "status",
          in: "query",
          required: false,
          description: "Filter by app status",
          schema: {
            type: "string",
            enum: ["active", "inactive"],
            example: "active"
          }
        },
        {
          name: "categoryId",
          in: "query",
          required: false,
          description: "MongoDB ObjectId of the category to filter by",
          schema: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "507f1f77bcf86cd799439012"
          }
        }
      ],
      responses: {
        "200": {
          description: "Apps retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/AdminAppListResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    }
  },
  "/admin/apps/{id}": {
    patch: {
      summary: "Update an app (admin)",
      description: `
Update one or more fields of a registered app. At least one field must be provided.

**Authentication:**
- Requires valid Bearer token (admin role)

**Business rules:**
- \`name\` must remain unique across all apps (conflict returns 409)
- \`categoryId\` must reference an existing category (not found returns 404)
- Setting \`status\` to \`inactive\` pauses the app — it stays in the registry but is hidden from users' dashboards
      `.trim(),
      tags: ["Web App Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "MongoDB ObjectId of the app to update",
          schema: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "507f1f77bcf86cd799439011"
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AdminAppUpdateInput" }
          }
        }
      },
      responses: {
        "200": {
          description: "App updated successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/AdminAppResponse" }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": {
          description:
            "Not found — app id does not exist (WEB_APP_NOT_FOUND) or category not found (WEB_APP_CATEGORY_NOT_FOUND)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        "409": {
          description:
            "Conflict — an app with this name already exists (WEB_APP_NAME_EXISTS)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" }
            }
          }
        },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    }
  },
  "/apps": {
    get: {
      summary: "List apps (user)",
      description: `
List the active-app catalog for the launcher. Returns apps with \`status=active\`; OAuth internals and secrets are never exposed.

**Role-scoped visibility:**
- Admins receive the full active catalog.
- Non-admin users receive only apps whose \`requiredRoles\` include the \`user\` role (admin-only apps are hidden).

**Authentication:**
- Requires valid Bearer token (any authenticated user)

**Query params:**
- \`page\` — 1-based page number (default 1)
- \`limit\` — page size (default 12, max 100)
- \`search\` — case-insensitive match on name / display name / description
- \`categoryId\` — filter the catalog by owning category (MongoDB ObjectId)
      `.trim(),
      tags: ["Web App"],
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
          schema: { type: "integer", minimum: 1, maximum: 100, example: 12 }
        },
        {
          name: "search",
          in: "query",
          required: false,
          schema: { type: "string", example: "blog" }
        },
        {
          name: "categoryId",
          in: "query",
          required: false,
          description: "MongoDB ObjectId of the category to filter by",
          schema: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "507f1f77bcf86cd799439012"
          }
        }
      ],
      responses: {
        "200": {
          description: "Paginated active-app catalog",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        $ref: "#/components/schemas/UserAppsListResponse"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "422": { $ref: "#/components/responses/ValidationError" }
      }
    }
  },
  "/apps/categories": {
    get: {
      summary: "List categories (public)",
      description: `
List all app categories for the launcher catalog filter. Returns every
category so callers can filter the active-app catalog by \`categoryId\`.

**Authentication:**
- Public endpoint — no authentication required.
- An optional Bearer token is accepted (attaches the requesting user when present) but anonymous requests are allowed.

**Rate limiting:**
- IP-based rate limit applies (see \`429\` response).

**Caching:**
- Response is cacheable — served with \`Cache-Control: public, max-age=300\`.
      `.trim(),
      tags: ["Web App"],
      responses: {
        "200": {
          description: "Categories retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/UserCategoryResponse"
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  },
  "/admin/apps/categories": {
    get: {
      summary: "List categories (admin)",
      description: `
List all app categories for the admin console.

**Authentication:**
- Requires valid Bearer token (admin role)
      `.trim(),
      tags: ["Web App Admin"],
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Categories retrieved successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/AdminCategoryResponse"
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" }
      }
    }
  }
};
