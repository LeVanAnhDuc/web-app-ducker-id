// libs
import j2s from "joi-to-swagger";
// types
import type { OpenAPIV3 } from "openapi-types";
// validators
import { changePasswordSchema } from "@/validators/schemas/change-password";

const { swagger: ChangePasswordRequestSchema } = j2s(changePasswordSchema);

const ChangePasswordResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    idToken: { type: "string" },
    expiresIn: {
      type: "integer",
      example: 3600,
      description: "Access token lifetime in seconds"
    }
  }
};

export const changePasswordSwaggerSchemas: Record<
  string,
  OpenAPIV3.SchemaObject
> = {
  ChangePasswordRequest: ChangePasswordRequestSchema as OpenAPIV3.SchemaObject,
  ChangePasswordResponse: ChangePasswordResponseSchema
};
