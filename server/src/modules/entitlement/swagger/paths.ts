// types
import type { OpenAPIV3 } from "openapi-types";

const matrixResponse: OpenAPIV3.ResponseObject = {
  description: "One row per user",
  content: {
    "application/json": {
      schema: {
        allOf: [
          { $ref: "#/components/schemas/SuccessResponse" },
          {
            type: "object",
            properties: {
              data: { $ref: "#/components/schemas/EntitlementMatrixResponse" }
            }
          }
        ]
      }
    }
  }
};

const adminErrors = {
  "400": { $ref: "#/components/responses/BadRequest" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" },
  "404": { $ref: "#/components/responses/NotFound" }
};

export const entitlementPaths: OpenAPIV3.PathsObject = {
  "/admin/entitlements": {
    get: {
      summary: "Get app access for users",
      description: `
Effective access of each user to every app in the catalog. With no override a
user gets an app when their role is in its \`requiredRoles\` (an admin gets
every app); an override grants beyond the role or revokes despite it.

**Authentication:** Bearer token, admin role.
      `.trim(),
      tags: ["Entitlements Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "userIds",
          in: "query",
          required: true,
          description: "1–50 comma-separated user ids, no duplicates",
          schema: { type: "string" }
        }
      ],
      responses: { "200": matrixResponse, ...adminErrors }
    },
    patch: {
      summary: "Change app access for users",
      description: `
Each change states the access the admin wants. The server stores an override
only when that differs from the role default, and removes the override when it
does not. Every id is checked before anything is written — one unknown user or
app fails the whole batch with 404. Idempotent.

**Authentication:** Bearer token, admin role.
**Rate limit:** per IP + admin.
      `.trim(),
      tags: ["Entitlements Admin"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateEntitlementsRequest" }
          }
        }
      },
      responses: {
        "200": matrixResponse,
        ...adminErrors,
        "429": { $ref: "#/components/responses/TooManyRequests" }
      }
    }
  }
};
