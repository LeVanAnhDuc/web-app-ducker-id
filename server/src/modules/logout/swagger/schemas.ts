// types
import type { OpenAPIV3 } from "openapi-types";

const LogoutResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      example: true,
      description: "Logout success status"
    }
  }
};
export const logoutSwaggerSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  LogoutResponse: LogoutResponseSchema
};
