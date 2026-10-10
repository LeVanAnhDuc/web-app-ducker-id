// types
import type { OpenAPIV3 } from "openapi-types";

const objectId = (description: string): OpenAPIV3.SchemaObject => ({
  type: "string",
  pattern: "^[a-fA-F0-9]{24}$",
  example: "507f1f77bcf86cd799439012",
  description
});

export const entitlementSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> =
  {
    UserAccessResponse: {
      type: "object",
      required: ["userId", "grantedAppIds", "overriddenAppIds"],
      properties: {
        userId: objectId("MongoDB _id of the user"),
        grantedAppIds: {
          type: "array",
          items: objectId("An app the user can open"),
          description:
            "Effective access over the whole catalog: the role default, with overrides applied"
        },
        overriddenAppIds: {
          type: "array",
          items: objectId("An app whose access differs from the role default"),
          description:
            "Cells that are exceptions. The role default of a cell is granted XOR overridden"
        }
      }
    },
    EntitlementMatrixResponse: {
      type: "object",
      required: ["users"],
      properties: {
        users: {
          type: "array",
          items: { $ref: "#/components/schemas/UserAccessResponse" }
        }
      }
    },
    UpdateEntitlementsRequest: {
      type: "object",
      required: ["changes"],
      properties: {
        changes: {
          type: "array",
          minItems: 1,
          maxItems: 200,
          items: {
            type: "object",
            required: ["userId", "appId", "granted"],
            properties: {
              userId: objectId("MongoDB _id of the user"),
              appId: objectId("MongoDB _id of the app"),
              granted: {
                type: "boolean",
                description: "The access the admin wants this user to have"
              }
            }
          }
        }
      }
    }
  };
